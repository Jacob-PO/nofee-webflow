# NoFee Webflow 프로젝트

Webflow와 GitHub를 연동한 코드 관리 시스템

## 📁 프로젝트 구조
```
nofee-webflow/
├── data/               # JSON 데이터 파일
│   ├── products.json   # 상품 데이터
│   ├── review.json     # 리뷰 데이터
│   ├── regions.json    # 지역 정보
│   ├── banner.json     # 메인 배너 데이터
│   ├── brands.json     # 브랜드 정보
│   ├── models.json     # 모델별 출고가 정보
│   └── config.json     # 사이트 설정
├── pages/              # 각 페이지별 JavaScript
│   ├── main.js         # 메인 페이지 스크립트
│   ├── ai.js           # AI 상담 스크립트
│   ├── more.js         # 상품 검색 스크립트
│   └── current.js      # 최근 본 상품 스크립트
├── styles/             # 페이지별 CSS 스타일
│   ├── ai.css
│   ├── more.css
│   └── current.css
├── embed/              # Webflow 삽입용 HTML
├── DATA_OVERVIEW.md    # 데이터 파일 설명
└── README.md
```

## 🚀 사용 방법

### 1. Webflow에서 사용하기

Webflow의 Embed Code Block에 다음 코드를 붙여넣으세요:

```html
<!-- 페이지 스타일 로드 (예: AI 페이지) -->
<link rel="stylesheet" href="https://jacob-po.github.io/nofee-webflow/styles/ai.css?v=1.0.0">

<!-- 페이지 HTML 구조 -->
<div class="nofee-embed">
    <!-- 여기에 페이지별 HTML 구조 -->
</div>

<!-- 페이지 스크립트 로드 -->
<script src="https://jacob-po.github.io/nofee-webflow/pages/ai.js?v=1.0.0"></script>
```

### 2. 파일 수정하기

1. GitHub에서 파일 수정
2. 커밋 후 푸시
3. GitHub Pages가 자동으로 업데이트 (약 1-2분 소요)

### 3. 캐시 문제 해결

브라우저 캐시로 인해 변경사항이 즉시 반영되지 않을 수 있습니다:

```html
<!-- 버전 번호를 변경하여 캐시 갱신 -->
<link rel="stylesheet" href="...ai.css?v=1.0.1">
<script src="...ai.js?v=1.0.1"></script>
```

## 📝 페이지별 설정

### 메인 페이지
- **파일**: `pages/main.js`
- **데이터**:
  - `products.json`
  - `review.json` (고객 리뷰)
  - `banner.json` (메인 배너)
  - `brands.json` (브랜드 정보)
  - `models.json` (모델별 출고가)
  - `config.json` (설정)
- **기능**: 배너 슬라이더, 상품 카드, 리뷰, 브랜드 선택

### AI 페이지
- **파일**: `pages/ai.js`
- **데이터**: `data/products.json`
- **기능**: AI 챗봇 인터페이스

### 더보기 페이지
- **파일**: `pages/more.js`
- **데이터**: `data/products.json`, `data/regions.json`
- **기능**: 상품 목록, 필터링

### 최근 본 상품 페이지
- **파일**: `pages/current.js`
- **데이터**: `data/products.json`
- **기능**: 로컬스토리지에 저장된 최근 본 상품 목록 표시

## 📊 데이터 파일 설명

### products.json
- **위치**: 현재 저장소 (`data/products.json`)
- **내용**: 전체 상품 데이터 (가격, 할인, 통신사 등)

### review.json
- **내용**: 고객 리뷰 데이터
- **필드**: name, product, comment, rating, highlight

### banner.json
- **내용**: 메인 페이지 배너 슬라이드
- **필드**: title, subtitle, emoji

### brands.json
- **내용**: 브랜드별 정보
- **필드**: icon, logo, description, 기본값

### models.json
- **내용**: 모델별 출고가 정보
- **필드**: originPrice, brand, category

### config.json
- **내용**: 전체 설정 및 URL 정보
- **필드**: site, api, settings, messages

### regions.json
- **내용**: 전국 지역 정보
- **필드**: id, name, districts

## 🔧 로컬 개발

```bash
# 저장소 클론
git clone https://github.com/Jacob-PO/nofee-webflow.git
cd nofee-webflow

# 로컬 서버 실행 (Python 3)
python -m http.server 8000

# 브라우저에서 확인
# http://localhost:8000
```

## 📌 주의사항

1. **CORS 정책**: GitHub Pages를 사용하면 CORS 문제가 거의 없습니다
2. **파일 크기**: 큰 이미지는 외부 CDN 사용을 권장합니다
3. **브라우저 지원**: 모던 브라우저 (Chrome, Safari, Firefox 최신 버전)
4. **데이터 관리**: 절대 하드코딩하지 말고 JSON 파일에서 데이터를 가져오세요
5. **캐시 관리**: 파일 수정 시 버전 번호(`?v=1.0.x`)를 변경하여 캐시를 갱신하세요

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 생성해주세요.

## 📝 데이터 업데이트 방법

### 상품 데이터 형식
```json
// data/products.json
{
  "date": "2025-06-01",
  "carrier": "SK",
  "model_name": "S25-256",
  "contract_type": "이동",
  "device_principal": -50000,
  "total_monthly_payment": 40916
}
```

### 리뷰 추가하기
```json
// data/review.json
{
  "id": 11,
  "name": "홍길동",
  "initial": "홍",
  "product": "갤럭시 S25 512GB",
  "comment": "정말 좋은 가격에 구매했어요. 월 7만원대라니 놀랍네요.",
  "rating": 5.0,
  "date": "2025. 06. 01.",
  "highlight": "월 7만원대"
}
```

### 모델 출고가 추가하기
```json
// data/models.json
"갤럭시 S25 512GB": {
  "originPrice": 1300000,
  "brand": "삼성",
  "category": "플래그십"
},
"Galaxy S25 512GB": {
  "originPrice": 1300000,
  "brand": "Samsung",
  "category": "Flagship"
}
```

### 배너 수정하기
```json
// data/banner.json
{
  "id": 4,
  "title": "새로운 <strong>프로모션</strong> 시작",
  "subtitle": "이번 달 특별 혜택",
  "emoji": "🎁",
  "active": true
}
```
