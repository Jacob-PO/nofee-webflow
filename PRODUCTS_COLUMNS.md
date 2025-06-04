# products.json 컬럼 설명

`data/products.json` 파일에서 사용되는 주요 필드(컬럼)의 의미를 정리한 문서입니다.

| 컬럼 | 설명 |
|------|------|
| `date` | 데이터가 수집된 날짜(yyyy-mm-dd hh:mm:ss 형식) |
| `carrier` | 통신사 코드 (`SKT`, `KT`, `LGU`) |
| `brand` | 제조사 브랜드 (예: `삼성`, `애플`) |
| `type` | 가입 유형 (`번호이동`, `기기변경`) |
| `support` | 지원 방식 (`공시지원`, `선택약정`) |
| `model` | 기기 모델명 (저장 용량 포함) |
| `principal` | 단말기 할인 또는 추가 금액 (원 단위, 음수는 할인) |
| `plan_name` | 적용된 요금제 이름 또는 금액(예: 109000) |
| `change_plan` | 통신사별 의무 유지 후 변경 가능한 기본 요금제 금액 |
| `contract_period` | 할부/약정 전체 기간(개월) |
| `plan_period` | 요금제를 유지해야 하는 최소 기간(개월) |
| `plan` | 월 통신요금 (원) |
| `installment` | 월 단말기 할부금 (원) |
| `total` | 월 납부 총액 (`plan` + `installment`) |

