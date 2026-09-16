// Guardrail AX: LLM 기반 Semantic Product Classifier
// OPENAI_API_KEY 또는 ANTHROPIC_API_KEY가 설정되어 있으면 해당 LLM의 Tool Calling(Function
// Calling) API로 구조화된 판단을 강제로 받아오고, 둘 다 없으면 동일한 3원칙을 룰 기반으로
// 흉내낸 폴백 분류기를 사용한다.
//
// 일반 JSON 모드(response_format: json_object) 대신 Tool Calling을 쓰는 이유:
// 모델이 "classify_purchase"라는 함수를 호출하는 형태로 답을 강제하기 때문에, 스키마에
// 없는 필드가 섞이거나 JSON 파싱이 깨지는 경우가 훨씬 줄어든다(자유 텍스트 응답이 아님).

const SYSTEM_PROMPT = `너는 B2B 식대 이월 포인트 결제의 세무 가드레일 AI다.
다음 원칙에 따라 결제 대상 상품이 "현금화 가능한 자산"인지 판단한 뒤,
반드시 classify_purchase 도구를 호출해서 결과를 알려줘.
1. 상품권, 기프트카드, 포인트/머니 충전권, 핀번호 교환권처럼 범용 구매력(어떤 상품/가맹점에서든 현금처럼 소비 가능)을 갖는 것은 무조건 차단한다.
2. 주유권처럼 실물 재화가 아니라 범용 화폐성 가치로 즉시 환금 가능한 상품도 차단한다.
3. 도서, 강의, 식음료, 운동/자기계발처럼 실질적인 소비재/서비스는 허용한다.
4. "이용권"이라는 이름만 보고 차단하지 마라. 이용권은 특정 매장/서비스에서만 사용 가능한 소비 쿠폰(예: 헬스장 이용권, 특정 쇼핑몰의 상품 구매용 이용권, 강의 수강권)인 경우가 많고, 이런 경우는 상품권과 달리 현금성 자산이 아니므로 허용한다. 이용권이라는 이름이 붙어 있어도 실질적으로 포인트/머니 충전이나 통신비 납부처럼 범용 현금 가치로 전환 가능한 경우에만 차단한다.`;

const TOOL_NAME = 'classify_purchase';
const TOOL_DESCRIPTION = '식대 이월 포인트로 결제하려는 상품이 세법상 현금화 가능한 자산인지 판단한다.';
const TOOL_PROPERTIES = {
  isBlocked: { type: 'boolean', description: '현금화 가능 자산이라 결제를 차단해야 하면 true' },
  riskScore: { type: 'number', description: '0(안전)~1(위험) 사이의 현금화 위험도 점수' },
  blockReason: { type: 'string', description: '판단 이유를 한국어 한 문장으로' },
};
const TOOL_REQUIRED = ['isBlocked', 'riskScore', 'blockReason'];

const CASH_LIKE_KEYWORDS = [
  '상품권', '기프트카드', '교환권', '충전권', '핀번호', 'pin번호', 'ssg머니',
  '주유권', '주유 상품권', '문화상품권', '백화점', '모바일상품권', '금액권',
];

function ruleBasedClassify({ itemName = '', mccCode = '' }) {
  const normalized = itemName.toLowerCase();
  const hit = CASH_LIKE_KEYWORDS.find((kw) => normalized.includes(kw.toLowerCase()));
  const gasStationMcc = mccCode === '5541' || mccCode === '5542';
  const departmentStoreMcc = mccCode === '5311';

  if (hit || gasStationMcc || departmentStoreMcc) {
    return {
      isBlocked: true,
      riskScore: 0.95,
      blockReason:
        '식대 이월 포인트는 세법 비과세 기준에 따라 상품권 및 현금성 자산 구매가 불가능합니다.',
      source: 'RULE_BASED_FALLBACK',
    };
  }

  return {
    isBlocked: false,
    riskScore: 0.05,
    blockReason: null,
    source: 'RULE_BASED_FALLBACK',
  };
}

async function llmClassifyAnthropic({ itemName, mccCode }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `상품명: ${itemName}\nMCC 코드: ${mccCode || '없음'}`,
        },
      ],
      tools: [
        {
          name: TOOL_NAME,
          description: TOOL_DESCRIPTION,
          input_schema: {
            type: 'object',
            properties: TOOL_PROPERTIES,
            required: TOOL_REQUIRED,
          },
        },
      ],
      tool_choice: { type: 'tool', name: TOOL_NAME },
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const toolUseBlock = data.content?.find((block) => block.type === 'tool_use');
  if (!toolUseBlock) {
    throw new Error('Anthropic response did not contain a tool_use block');
  }
  const parsed = toolUseBlock.input;

  return {
    isBlocked: Boolean(parsed.isBlocked),
    riskScore: Number(parsed.riskScore ?? 0),
    blockReason: parsed.blockReason ?? null,
    source: 'LLM_TOOL_CALL_ANTHROPIC',
  };
}

async function llmClassifyOpenAI({ itemName, mccCode }) {
  const apiKey = process.env.OPENAI_API_KEY;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `상품명: ${itemName}\nMCC 코드: ${mccCode || '없음'}` },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: TOOL_NAME,
            description: TOOL_DESCRIPTION,
            parameters: {
              type: 'object',
              properties: TOOL_PROPERTIES,
              required: TOOL_REQUIRED,
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: TOOL_NAME } },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error('OpenAI response did not contain a tool call');
  }
  const parsed = JSON.parse(toolCall.function.arguments);

  return {
    isBlocked: Boolean(parsed.isBlocked),
    riskScore: Number(parsed.riskScore ?? 0),
    blockReason: parsed.blockReason ?? null,
    source: 'LLM_TOOL_CALL_OPENAI',
  };
}

async function classifyPurchase(input) {
  const provider = process.env.OPENAI_API_KEY
    ? llmClassifyOpenAI
    : process.env.ANTHROPIC_API_KEY
    ? llmClassifyAnthropic
    : null;

  if (provider) {
    try {
      return await provider(input);
    } catch (err) {
      console.error('[Guardrail AX] LLM classification failed, falling back to rules:', err.message);
      return ruleBasedClassify(input);
    }
  }
  return ruleBasedClassify(input);
}

module.exports = { classifyPurchase };
