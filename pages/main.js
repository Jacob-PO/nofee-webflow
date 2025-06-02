// 🚀 노피 메인페이지 스크립트 v3.2 - 창의적 기능 중심
(function() {
    'use strict';
    
    // 🎯 전역 상태 관리
    let state = {
        config: null,
        products: [],
        reviews: [],
        banners: [],
        brands: {},
        models: {},
        selectedPlanType: 'all',
        currentBannerIndex: 0,
        bannerInterval: null,
        isDataLoaded: false,
        loadingErrors: []
    };

    // GitHub 저장소 설정
    const scriptUrl = new URL(document.currentScript.src);
    const basePath = scriptUrl.pathname.split('/').slice(0, -2).join('/');
    const GITHUB_BASE_URL = scriptUrl.origin + basePath;
    
    // 📂 데이터 URL 설정
    const DATA_URLS = {
        config: `${GITHUB_BASE_URL}/data/config.json`,
        products: `${GITHUB_BASE_URL}/data/products.json`,
        reviews: `${GITHUB_BASE_URL}/data/review.json`,
        banners: `${GITHUB_BASE_URL}/data/banner.json`,
        brands: `${GITHUB_BASE_URL}/data/brands.json`,
        models: `${GITHUB_BASE_URL}/data/models.json`
    };

    // 🔧 유틸리티 함수들
    const utils = {
        formatKRW: (value) => {
            return Math.abs(Number(value)).toLocaleString("ko-KR") + "원";
        },

        formatDate: (dateString) => {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) return '오늘';
            if (diffDays === 2) return '어제';
            if (diffDays <= 7) return `${diffDays}일 전`;
            return date.toLocaleDateString('ko-KR');
        },

        sanitizeHTML: (str) => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        createElement: (tag, className, innerHTML) => {
            const element = document.createElement(tag);
            if (className) element.className = className;
            if (innerHTML) element.innerHTML = innerHTML;
            return element;
        },

        transformProduct: (item) => {
            const modelMap = {
                'S25-256': '갤럭시 S25 256GB',
                'S25플러스-256': '갤럭시 S25 플러스 256GB',
                'S25울트라-256': '갤럭시 S25 울트라 256GB',
                'S24FE': '갤럭시 S24 FE',
                '플립6-256': '갤럭시 Z 플립6 256GB',
                '플립5-256': '갤럭시 Z 플립5 256GB',
                '폴드6-256': '갤럭시 Z 폴드6 256GB',
                '와이드7': '갤럭시 와이드7',
                'A16': '갤럭시 A16',
                '아이폰16-128': '아이폰 16 128GB',
                '아이폰16-256': '아이폰 16 256GB',
                '아이폰16프로-128': '아이폰 16 Pro 128GB',
                '아이폰16프로-256': '아이폰 16 Pro 256GB',
                '아이폰16프로맥스-256': '아이폰 16 Pro Max 256GB',
                '아이폰15-128': '아이폰 15 128GB',
                '아이폰15프로-128': '아이폰 15 Pro 128GB',
                '시나모롤 키즈폰': '시나모롤 키즈폰',
                '키즈폰 무너': '키즈폰 무너'
            };
            const carrierMap = { SK: 'SKT', KT: 'KT', LG: 'LGU' };
            const typeMap = { '이동': '번호이동', '기변': '기기변경' };
            const supportMap = { '공시': '공시지원', '선약': '선택약정' };

            const t = { ...item };
            t.carrier = carrierMap[item.carrier] || item.carrier;
            t.type = typeMap[item.contract_type] || item.contract_type;
            t.support = supportMap[item.subsidy_type] || item.subsidy_type;
            t.model = modelMap[item.model_name] || item.model_name;
            t.principal = item.device_principal || 0;
            t.plan_name = item.plan_monthly_payment || 0;
            t.change_plan = item.post_plan_monthly_payment || 0;
            t.contract_period = item.contract_months || 0;
            t.plan_period = item.plan_required_months || 0;
            t.plan = item.plan_effective_monthly_payment || 0;
            t.installment = item.device_monthly_payment || 0;
            t.total = item.total_monthly_payment || 0;
            return t;
        },

        transformProducts: (data) => {
            if (!Array.isArray(data)) return [];
            return data.map(utils.transformProduct);
        },

        setElementContent: (selector, content, isHTML = false) => {
            const element = document.querySelector(selector);
            if (element) {
                if (isHTML) {
                    element.innerHTML = content;
                } else {
                    element.textContent = content;
                }
            }
        },

        showSection: (sectionId) => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'block';
                setTimeout(() => section.classList.add('visible'), 100);
            }
        },

        hideSection: (sectionId) => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
                section.classList.remove('visible');
            }
        }
    };

    // 📥 데이터 로더
    const dataLoader = {
        async fetchData(url, name, isOptional = false) {
            try {
                console.log(`📥 Loading ${name} from ${url}`);
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log(`✅ ${name} loaded successfully:`, data);
                return data;
            } catch (error) {
                if (isOptional) {
                    console.warn(`⚠️ Optional ${name} load failed (continuing):`, error.message);
                    return null;
                } else {
                    console.error(`❌ Failed to load ${name}:`, error.message);
                    state.loadingErrors.push({ name, error: error.message });
                    throw error;
                }
            }
        },

        async loadAllData() {
            try {
                console.log('🚀 노피 데이터 로드 시작...');
                
                // 1단계: 필수 설정 데이터 로드
                console.log('📋 1단계: 기본 설정 로드');
                try {
                    state.config = await this.fetchData(DATA_URLS.config, 'config', true);
                } catch (error) {
                    console.warn('⚠️ Config 로드 실패, 기본값 사용');
                    state.config = this.getDefaultConfig();
                }
                
                // 설정 데이터로 기본 UI 업데이트
                this.updateBasicUI();
                
                // 2단계: 코어 데이터 로드 (선택적)
                console.log('🔧 2단계: 코어 데이터 로드');
                const coreDataResults = await Promise.allSettled([
                    this.fetchData(DATA_URLS.models, 'models', true).then(data => state.models = data || {}),
                    this.fetchData(DATA_URLS.brands, 'brands', true).then(data => state.brands = data || {})
                ]);
                
                // 3단계: 컨텐츠 데이터 로드 (선택적)
                console.log('📱 3단계: 컨텐츠 데이터 로드');
                const contentDataResults = await Promise.allSettled([
                    this.fetchData(DATA_URLS.banners, 'banners', true).then(data => state.banners = data || []),
                    this.fetchData(DATA_URLS.products, 'products', true).then(data => state.products = utils.transformProducts(data || [])),
                    this.fetchData(DATA_URLS.reviews, 'reviews', true).then(data => state.reviews = data || [])
                ]);
                
                // 로딩 결과 확인
                const allResults = [...coreDataResults, ...contentDataResults];
                const failedLoads = allResults.filter(result => result.status === 'rejected');
                
                if (failedLoads.length > 0) {
                    console.warn(`⚠️ ${failedLoads.length}개 데이터 로드 실패, 기본값으로 진행`);
                }
                
                state.isDataLoaded = true;
                console.log('✅ 데이터 로드 완료, UI 초기화 시작');
                
                // 로딩 화면 숨기기
                utils.hideSection('initialLoading');
                
                // UI 초기화
                await this.initializeAllSections();
                
            } catch (error) {
                console.error('❌ Critical data loading failed:', error);
                this.showError('데이터를 불러오는데 실패했습니다');
            }
        },

        getDefaultConfig() {
            return {
                site: {
                    name: "노피",
                    title: "노피 - 전국 어디서나 성지 가격으로 휴대폰 최저가"
                },
                hero: {
                    title: "전국 어디서나 <span class=\"highlight\">성지 가격</span>으로<br>휴대폰 최저가를 찾아보세요",
                    subtitle: "AI로 찾아보는 집근처 휴대폰 성지 최저가 노피AI",
                    features: [
                        { emoji: "🎯", text: "전국 성지 가격" },
                        { emoji: "🤖", text: "AI 맞춤 추천" },
                        { emoji: "📞", text: "전화 없이 신청" }
                    ]
                },
                ai: {
                    title: "나에게 딱 맞는 휴대폰 찾기",
                    description: "AI가 당신의 사용패턴을 분석해서<br><strong>최적의 기종과 최저가를 추천</strong>해드려요",
                    features: ["💬 1:1 맞춤 상담", "📊 가격 비교", "⚡ 즉시 견적"],
                    ctaText: "AI 상담 시작"
                },
                products: {
                    title: "지금 가장 인기있는 상품",
                    subtitle: "할인율 높은 순으로 AI가 엄선한 추천 상품"
                },
                reviews: {
                    title: "실시간 고객 후기",
                    subtitle: "실제 구매 고객들의 생생한 경험담"
                },
                urls: {
                    ai: "https://nofee.team/ai",
                    products: "https://nofee.team/more",
                    product: "https://nofee.team/ai"
                }
            };
        },

        updateBasicUI() {
            if (!state.config) return;
            
            const config = state.config;
            
            if (config.site?.title) {
                document.title = config.site.title;
            }
            
            if (config.theme) {
                const root = document.documentElement;
                Object.entries(config.theme).forEach(([key, value]) => {
                    root.style.setProperty(`--site-${key}`, value);
                });
            }
        },

        async initializeAllSections() {
            try {
                // 순차적으로 섹션 초기화
                await this.safeInit('Hero', () => this.initHeroSection());
                await this.safeInit('Banner', () => this.initBannerSection());
                await this.safeInit('AI', () => this.initAISection());
                await this.safeInit('Stats', () => this.initStatsSection());
                await this.safeInit('PlanComparison', () => this.initPlanComparisonSection());
                await this.safeInit('Products', () => this.initProductsSection());
                await this.safeInit('Reviews', () => this.initReviewsSection());
                
                // 애니메이션 및 인터랙션 초기화
                this.initAnimations();
                this.initEventListeners();
                
                console.log('🎉 All sections initialized successfully');
                
            } catch (error) {
                console.error('❌ Section initialization failed:', error);
            }
        },

        async safeInit(sectionName, initFunction) {
            try {
                await initFunction();
                console.log(`✅ ${sectionName} section initialized`);
            } catch (error) {
                console.error(`❌ ${sectionName} section failed:`, error);
            }
        },

        async initHeroSection() {
            if (!state.config?.hero) return;
            
            const { hero } = state.config;
            
            utils.setElementContent('#heroTitle', hero.title, true);
            utils.setElementContent('#heroSubtitle', hero.subtitle);
            
            if (hero.features && Array.isArray(hero.features)) {
                const featuresContainer = document.getElementById('heroFeatures');
                if (featuresContainer) {
                    featuresContainer.innerHTML = '';
                    
                    hero.features.forEach(feature => {
                        const badge = utils.createElement('div', 'feature-badge');
                        badge.innerHTML = `
                            <span class="emoji">${feature.emoji}</span>
                            ${feature.text}
                        `;
                        featuresContainer.appendChild(badge);
                    });
                }
            }
            
            utils.showSection('heroSection');
        },

        async initBannerSection() {
            if (!state.banners || state.banners.length === 0) {
                console.log('⚠️ No banners data, using default banners');
                state.banners = [
                    {
                        title: "전국 어디서나<br><strong>성지 가격</strong>으로 드립니다",
                        subtitle: "오직 노피 입점 대리점에서만 가능한 특가",
                        emoji: "🎯"
                    },
                    {
                        title: "AI가 찾아주는<br><strong>집근처 휴대폰 성지</strong>",
                        subtitle: "노피AI로 간편하게 최저가 비교하세요",
                        emoji: "🤖"
                    },
                    {
                        title: "부담없는 구매<br><strong>전화없이 견적신청</strong>",
                        subtitle: "신청과 카톡만으로 구매 끝!",
                        emoji: "⚡"
                    }
                ];
            }
            
            const track = document.getElementById('bannerTrack');
            const indicators = document.getElementById('bannerIndicators');
            
            if (!track || !indicators) return;
            
            track.innerHTML = '';
            indicators.innerHTML = '';
            
            state.banners.forEach((banner, index) => {
                const slide = utils.createElement('div', 'banner-slide');
                slide.innerHTML = `
                    <div class="slide-content">
                        <div class="slide-text">
                            <h3>${banner.title}</h3>
                            <p>${banner.subtitle}</p>
                        </div>
                        <div class="slide-visual">${banner.emoji}</div>
                    </div>
                `;
                track.appendChild(slide);
                
                const indicator = utils.createElement('div', index === 0 ? 'indicator active' : 'indicator');
                indicator.addEventListener('click', () => {
                    this.goToBannerSlide(index);
                    this.stopBannerAutoSlide();
                    setTimeout(() => this.startBannerAutoSlide(), 3000);
                });
                indicators.appendChild(indicator);
            });
            
            this.startBannerAutoSlide();
            utils.showSection('bannerSection');
        },

        async initAISection() {
            if (!state.config?.ai) return;
            
            const { ai } = state.config;
            
            utils.setElementContent('#aiBadgeText', ai.badgeText || '노피 AI');
            utils.setElementContent('#aiTitle', ai.title, true);
            utils.setElementContent('#aiDescription', ai.description, true);
            utils.setElementContent('#aiCtaText', ai.ctaText || 'AI 상담 시작');
            
            if (ai.features && Array.isArray(ai.features)) {
                const featuresContainer = document.getElementById('aiFeatures');
                if (featuresContainer) {
                    featuresContainer.innerHTML = '';
                    
                    ai.features.forEach(feature => {
                        const tag = utils.createElement('span', 'feature-tag', feature);
                        featuresContainer.appendChild(tag);
                    });
                }
            }
            
            const aiCard = document.getElementById('aiCtaCard');
            if (aiCard && state.config.urls?.ai) {
                aiCard.addEventListener('click', () => {
                    window.open(state.config.urls.ai, '_blank');
                });
                
                aiCard.setAttribute('tabindex', '0');
                aiCard.setAttribute('role', 'button');
                aiCard.setAttribute('aria-label', ai.ctaText || 'AI 상담 시작');
            }
            
            utils.showSection('aiCtaSection');
        },

        async initStatsSection() {
            if (!state.products || state.products.length === 0) {
                console.log('⚠️ No products data, skipping stats section');
                return;
            }
            
            const statsGrid = document.getElementById('statsGrid');
            if (!statsGrid) return;
            
            // 통계 계산
            const stats = this.calculateProductStats();
            
            statsGrid.innerHTML = '';
            
            // 통계 카드 생성
            const statCards = [
                {
                    icon: '🔥',
                    value: `${stats.maxDiscountRate}%`,
                    label: '최대 할인율',
                    change: '실시간 업데이트',
                    changeClass: 'positive'
                },
                {
                    icon: '💰',
                    value: utils.formatKRW(stats.avgTotal),
                    label: '평균 월 납부금',
                    change: `전월 대비 ${stats.totalChange}원`,
                    changeClass: stats.totalChange < 0 ? 'positive' : 'negative'
                },
                {
                    icon: '📱',
                    value: `${stats.totalProducts}개`,
                    label: '전체 상품 수',
                    change: `최신 업데이트: ${utils.formatDate(stats.latestUpdate)}`,
                    changeClass: 'positive'
                },
                {
                    icon: '📊',
                    value: `${stats.carrierStats.SKT}:${stats.carrierStats.KT}:${stats.carrierStats.LGU}`,
                    label: 'SKT:KT:LG+ 비율',
                    change: '통신사별 상품 수',
                    changeClass: 'positive'
                }
            ];
            
            statCards.forEach((stat, index) => {
                const card = utils.createElement('div', 'stat-card');
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                
                card.innerHTML = `
                    <div class="stat-icon">${stat.icon}</div>
                    <div class="stat-value">${stat.value}</div>
                    <div class="stat-label">${stat.label}</div>
                    <div class="stat-change ${stat.changeClass}">${stat.change}</div>
                `;
                
                statsGrid.appendChild(card);
                
                // 스태거드 애니메이션
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                    card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                }, index * 100);
            });
            
            utils.showSection('statsSection');
        },

        async initPlanComparisonSection() {
            if (!state.products || state.products.length === 0) {
                console.log('⚠️ No products data, skipping plan comparison section');
                return;
            }
            
            // 탭 이벤트 리스너 설정
            const tabs = document.querySelectorAll('.comparison-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // 탭 활성화
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    // 선택된 타입 업데이트
                    state.selectedPlanType = tab.dataset.type;
                    this.updatePlanComparison();
                });
            });
            
            // 초기 비교 데이터 렌더링
            this.updatePlanComparison();
            
            utils.showSection('planComparisonSection');
        },

        updatePlanComparison() {
            const comparisonContent = document.getElementById('comparisonContent');
            if (!comparisonContent) return;
            
            // 필터링된 상품 데이터
            const filteredProducts = state.products.filter(product => {
                if (state.selectedPlanType === 'all') return true;
                return product.type === state.selectedPlanType;
            });
            
            // 통신사별 통계 계산
            const carrierStats = this.calculateCarrierStats(filteredProducts);
            
            comparisonContent.innerHTML = '';
            
            // 통신사별 카드 생성
            Object.entries(carrierStats).forEach(([carrier, stats]) => {
                const planCard = utils.createElement('div', 'plan-card');
                
                planCard.innerHTML = `
                    <div class="plan-carrier">${carrier}</div>
                    <div class="plan-details">
                        <div class="plan-detail">
                            <span class="plan-detail-label">상품 수</span>
                            <span class="plan-detail-value">${stats.count}개</span>
                        </div>
                        <div class="plan-detail">
                            <span class="plan-detail-label">평균 요금</span>
                            <span class="plan-detail-value">${utils.formatKRW(stats.avgPlan)}</span>
                        </div>
                        <div class="plan-detail">
                            <span class="plan-detail-label">평균 총액</span>
                            <span class="plan-detail-value">${utils.formatKRW(stats.avgTotal)}</span>
                        </div>
                        <div class="plan-detail">
                            <span class="plan-detail-label">최저가</span>
                            <span class="plan-detail-value">${utils.formatKRW(stats.minTotal)}</span>
                        </div>
                        <div class="plan-detail">
                            <span class="plan-detail-label">평균 할부</span>
                            <span class="plan-detail-value">${utils.formatKRW(stats.avgInstallment)}</span>
                        </div>
                    </div>
                `;
                
                comparisonContent.appendChild(planCard);
            });
        },

        async initProductsSection() {
            if (!state.products || state.products.length === 0) {
                console.log('⚠️ No products data, skipping products section');
                return;
            }
            
            if (state.config?.products) {
                utils.setElementContent('#productsTitle', state.config.products.title || '지금 가장 인기있는 상품');
                utils.setElementContent('#productsSubtitle', state.config.products.subtitle || '할인율 높은 순으로 AI가 엄선한 추천 상품');
                utils.setElementContent('#loadMoreText', state.config.products.loadMoreText || '전체 상품 보기');
            }
            
            this.renderProducts();
            
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (loadMoreBtn && state.config?.urls?.products) {
                loadMoreBtn.addEventListener('click', () => {
                    window.open(state.config.urls.products, '_blank');
                });
            }
            
            utils.showSection('productsSection');
        },

        async initReviewsSection() {
            if (!state.reviews || state.reviews.length === 0) {
                console.log('⚠️ No reviews data, skipping reviews section');
                return;
            }
            
            if (state.config?.reviews) {
                utils.setElementContent('#reviewsTitle', state.config.reviews.title || '실시간 고객 후기');
                utils.setElementContent('#reviewsSubtitle', state.config.reviews.subtitle || '실제 구매 고객들의 생생한 경험담');
            }
            
            this.updateReviewStats();
            this.renderReviews();
            
            utils.showSection('reviewsSection');
        },

        // 통계 계산 함수들
        calculateProductStats() {
            if (!state.products.length) {
                return {
                    maxDiscountRate: 0,
                    avgTotal: 0,
                    totalProducts: 0,
                    latestUpdate: new Date(),
                    totalChange: 0,
                    carrierStats: { SKT: 0, KT: 0, LGU: 0 }
                };
            }
            
            let maxDiscountRate = 0;
            let totalSum = 0;
            let latestDate = new Date(0);
            const carrierCounts = { SKT: 0, KT: 0, LGU: 0 };
            
            state.products.forEach(product => {
                // 할인율 계산
                const { discountRate } = this.calculateDiscount(product.model, product.principal);
                if (discountRate > maxDiscountRate) {
                    maxDiscountRate = discountRate;
                }
                
                // 평균 총액 계산
                totalSum += product.total;
                
                // 최신 업데이트 날짜
                const productDate = new Date(product.date);
                if (productDate > latestDate) {
                    latestDate = productDate;
                }
                
                // 통신사별 통계
                if (carrierCounts.hasOwnProperty(product.carrier)) {
                    carrierCounts[product.carrier]++;
                }
            });
            
            return {
                maxDiscountRate,
                avgTotal: Math.round(totalSum / state.products.length),
                totalProducts: state.products.length,
                latestUpdate: latestDate,
                totalChange: -5000, // 임시값 (실제로는 이전 데이터와 비교 필요)
                carrierStats: carrierCounts
            };
        },

        calculateCarrierStats(products) {
            const carriers = {};
            
            products.forEach(product => {
                if (!carriers[product.carrier]) {
                    carriers[product.carrier] = {
                        count: 0,
                        totalPlan: 0,
                        totalAmount: 0,
                        totalInstallment: 0,
                        minTotal: Infinity
                    };
                }
                
                const carrier = carriers[product.carrier];
                carrier.count++;
                carrier.totalPlan += product.plan;
                carrier.totalAmount += product.total;
                carrier.totalInstallment += product.installment;
                
                if (product.total < carrier.minTotal) {
                    carrier.minTotal = product.total;
                }
            });
            
            // 평균 계산
            Object.values(carriers).forEach(carrier => {
                carrier.avgPlan = Math.round(carrier.totalPlan / carrier.count);
                carrier.avgTotal = Math.round(carrier.totalAmount / carrier.count);
                carrier.avgInstallment = Math.round(carrier.totalInstallment / carrier.count);
            });
            
            return carriers;
        },

        renderProducts() {
            const loadingElement = document.getElementById('productsLoading');
            const gridElement = document.getElementById('productsGrid');
            
            if (!loadingElement || !gridElement) return;
            
            const filteredProducts = this.filterAndSortProducts();
            
            loadingElement.style.display = 'none';
            gridElement.style.display = 'grid';
            gridElement.innerHTML = '';
            
            if (filteredProducts.length === 0) {
                gridElement.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--gray-500);">표시할 상품이 없습니다.</div>';
                return;
            }
            
            // 상품 카드 생성 (더 상세한 버전)
            filteredProducts.slice(0, 4).forEach((product, index) => {
                const card = this.createDetailedProductCard(product);
                gridElement.appendChild(card);
                
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 150);
            });
        },

        filterAndSortProducts() {
            return state.products
                .filter(product => {
                    if (product.total < 30000) return false;
                    return true;
                })
                .map(product => {
                    const { discountRate } = this.calculateDiscount(product.model, product.principal);
                    return { ...product, discountRate };
                })
                .sort((a, b) => {
                    if (a.discountRate === 0 && b.discountRate === 0) {
                        return a.total - b.total;
                    }
                    return b.discountRate - a.discountRate;
                });
        },

        createDetailedProductCard(product) {
            const brandInfo = this.getBrandInfo(product.brand);
            const { discount, discountRate, originPrice } = this.calculateDiscount(product.model, product.principal);
            
            const card = utils.createElement('div', 'product-card');
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            
            const supportText = this.getSupportText(product.support);
            
            card.innerHTML = `
                ${discountRate > 0 ? `<div class="discount-banner">${discountRate}% 할인</div>` : ''}
                
                <div class="product-header">
                    <div class="brand-icon ${brandInfo.hasImage ? '' : 'text-icon'}" ${brandInfo.hasImage ? `style="background-image: url(${brandInfo.logo})"` : ''}>${brandInfo.hasImage ? '' : brandInfo.icon}</div>
                    <div class="product-info">
                        <h4>${utils.sanitizeHTML(product.model)}</h4>
                        <div class="product-meta">
                            <span class="meta-tag">${utils.sanitizeHTML(product.carrier)}</span>
                            <span class="meta-tag">${utils.sanitizeHTML(product.type)}</span>
                            <span class="meta-tag">${utils.sanitizeHTML(supportText)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="price-details">
                    <div class="price-row">
                        <span class="price-label">출고가</span>
                        <span class="price-value">${utils.formatKRW(originPrice)}</span>
                    </div>
                    ${discount > 0 ? `
                    <div class="price-row">
                        <span class="price-label">단말 할인</span>
                        <span class="price-value">-${utils.formatKRW(discount)}</span>
                    </div>
                    ` : ''}
                    <div class="price-row">
                        <span class="price-label">월 통신요금</span>
                        <span class="price-value">${utils.formatKRW(product.plan)}</span>
                    </div>
                    <div class="price-row">
                        <span class="price-label">월 할부금</span>
                        <span class="price-value">${utils.formatKRW(product.installment)}</span>
                    </div>
                    <div class="price-row">
                        <span class="price-label">월 총 납부금</span>
                        <span class="price-value price-highlight">${utils.formatKRW(product.total)}</span>
                    </div>
                </div>
                
                <div class="contract-info">
                    <div class="contract-item">
                        <div class="contract-label">계약 기간</div>
                        <div class="contract-value">${product.contract_period}개월</div>
                    </div>
                    <div class="contract-item">
                        <div class="contract-label">요금제 유지</div>
                        <div class="contract-value">${product.plan_period}개월</div>
                    </div>
                </div>
                
                <div class="final-price">
                    <div class="final-price-label">월 납부 총액</div>
                    <div class="final-price-value">${utils.formatKRW(product.total)}</div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                this.handleProductClick(product);
            });
            
            return card;
        },

        renderReviews() {
            const reviewsScroll = document.getElementById('reviewsScroll');
            if (!reviewsScroll) return;
            
            reviewsScroll.innerHTML = '';
            
            state.reviews.forEach((review, index) => {
                const stars = '⭐'.repeat(Math.floor(review.rating));
                
                const reviewCard = utils.createElement('div', 'review-card');
                reviewCard.style.opacity = '0';
                reviewCard.style.transform = 'translateY(20px)';
                
                let comment = review.comment;
                if (review.highlight) {
                    comment = comment.replace(
                        new RegExp(review.highlight, 'gi'),
                        `<span class='review-highlight'>${review.highlight}</span>`
                    );
                }
                
                reviewCard.innerHTML = `
                    <div class="review-header">
                        <div class="reviewer-avatar">${review.initial}</div>
                        <div class="reviewer-info">
                            <h5>${utils.sanitizeHTML(review.name)}</h5>
                            <div class="review-rating">${stars} ${review.rating}</div>
                        </div>
                    </div>
                    <div class="review-product">${utils.sanitizeHTML(review.product)}</div>
                    <div class="review-text">${comment}</div>
                `;
                
                reviewsScroll.appendChild(reviewCard);
                
                setTimeout(() => {
                    reviewCard.style.opacity = '1';
                    reviewCard.style.transform = 'translateY(0)';
                    reviewCard.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                }, index * 100);
            });
            
            this.startReviewAutoScroll();
        },

        updateReviewStats() {
            const ratingSummary = document.getElementById('ratingSummary');
            if (!ratingSummary || !state.reviews.length) return;
            
            const totalRating = state.reviews.reduce((sum, review) => sum + review.rating, 0);
            const avgRating = (totalRating / state.reviews.length).toFixed(1);
            const starDisplay = '⭐'.repeat(Math.floor(avgRating));
            
            ratingSummary.innerHTML = `
                <span class="rating-score">${avgRating}</span>
                <div>
                    <div class="rating-stars">${starDisplay}</div>
                    <div class="rating-count">${state.reviews.length.toLocaleString()}개 리뷰</div>
                </div>
            `;
        },

        // Helper 메서드들
        getBrandInfo(brand) {
            const brandData = state.brands[brand] || {};
            
            return {
                icon: brandData.icon || brand.charAt(0).toUpperCase(),
                logo: brandData.logo,
                hasImage: !!brandData.logo,
                displayName: brand
            };
        },

        getOriginPrice(model) {
            if (state.models[model]) {
                return state.models[model].originPrice;
            }
            
            for (const [key, value] of Object.entries(state.models)) {
                if (model.includes(key) || key.includes(model)) {
                    return value.originPrice;
                }
            }
            
            return 1000000;
        },

        calculateDiscount(model, principal) {
            const originPrice = this.getOriginPrice(model);
            if (principal >= 0) {
                return { discount: 0, discountRate: 0, originPrice };
            }
            
            const discount = Math.abs(principal);
            const discountRate = Math.round((discount / originPrice) * 100);
            return { discount, discountRate, originPrice };
        },

        getSupportText(support) {
            const supportMap = {
                'O': '지원금O',
                'X': '지원금X',
                '공시지원': '공시지원',
                '선택약정': '선택약정'
            };
            return supportMap[support] || support;
        },

        // 이벤트 핸들러들
        handleProductClick(product) {
            const baseUrl = state.config?.urls?.product || 'https://nofee.team/ai';
            
            const params = new URLSearchParams({
                date: product.date || '',
                carrier: product.carrier || '',
                model_name: product.model_name || '',
                contract_type: product.contract_type || '',
                device_price_input: product.device_price_input || 0,
                subsidy_type: product.subsidy_type || '',
                plan_name: product.plan_name || '',
                contract_months: product.contract_months || 0,
                device_principal: product.device_principal || 0,
                plan_monthly_payment: product.plan_monthly_payment || 0,
                post_plan_monthly_payment: product.post_plan_monthly_payment || 0,
                plan_required_months: product.plan_required_months || 0,
                optional_discount_ratio: product.optional_discount_ratio || 0,
                device_monthly_payment: product.device_monthly_payment || 0,
                plan_effective_monthly_payment: product.plan_effective_monthly_payment || 0,
                total_monthly_payment: product.total_monthly_payment || 0,
                brand: product.brand || '',
                storage: product.storage || ''
            });
            
            window.open(baseUrl + '?' + params.toString(), '_blank');
        },

        // 배너 슬라이더 메서드들
        goToBannerSlide(index) {
            state.currentBannerIndex = index;
            const track = document.getElementById('bannerTrack');
            const indicators = document.querySelectorAll('#bannerIndicators .indicator');
            
            if (track) {
                track.style.transform = `translateX(-${state.currentBannerIndex * 100}%)`;
            }
            
            indicators.forEach((indicator, i) => {
                indicator.classList.toggle('active', i === state.currentBannerIndex);
            });
        },

        nextBannerSlide() {
            const nextIndex = (state.currentBannerIndex + 1) % state.banners.length;
            this.goToBannerSlide(nextIndex);
        },

        startBannerAutoSlide() {
            if (state.banners.length > 1) {
                state.bannerInterval = setInterval(() => {
                    this.nextBannerSlide();
                }, 5000);
            }
        },

        stopBannerAutoSlide() {
            if (state.bannerInterval) {
                clearInterval(state.bannerInterval);
                state.bannerInterval = null;
            }
        },

        // 리뷰 자동 스크롤
        startReviewAutoScroll() {
            const reviewsScroll = document.getElementById('reviewsScroll');
            if (!reviewsScroll) return;
            
            let scrollPosition = 0;
            const scrollStep = 320;
            let autoScrollInterval;
            let userInteracting = false;
            
            const autoScroll = () => {
                const maxScroll = reviewsScroll.scrollWidth - reviewsScroll.clientWidth;
                
                if (scrollPosition >= maxScroll) {
                    scrollPosition = 0;
                } else {
                    scrollPosition += scrollStep;
                }
                
                reviewsScroll.scrollTo({
                    left: scrollPosition,
                    behavior: 'smooth'
                });
            };
            
            const startAuto = () => {
                autoScrollInterval = setInterval(() => {
                    if (!userInteracting) autoScroll();
                }, 4000);
            };
            
            const stopAuto = () => {
                if (autoScrollInterval) {
                    clearInterval(autoScrollInterval);
                    autoScrollInterval = null;
                }
            };
            
            ['touchstart', 'mousedown'].forEach(event => {
                reviewsScroll.addEventListener(event, () => {
                    userInteracting = true;
                    stopAuto();
                }, { passive: true });
            });
            
            ['touchend', 'mouseup'].forEach(event => {
                reviewsScroll.addEventListener(event, () => {
                    userInteracting = false;
                    setTimeout(startAuto, 3000);
                }, { passive: true });
            });
            
            reviewsScroll.addEventListener('mouseenter', () => {
                userInteracting = true;
                stopAuto();
            });
            
            reviewsScroll.addEventListener('mouseleave', () => {
                userInteracting = false;
                setTimeout(startAuto, 1000);
            });
            
            startAuto();
        },

        // 애니메이션 초기화
        initAnimations() {
            const sections = document.querySelectorAll('.nofee-section');
            
            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('visible');
                        }
                    });
                }, {
                    threshold: 0.1,
                    rootMargin: '0px 0px -50px 0px'
                });
                
                sections.forEach(section => {
                    observer.observe(section);
                });
            } else {
                sections.forEach(section => {
                    section.classList.add('visible');
                });
            }
        },

        // 이벤트 리스너 초기화
        initEventListeners() {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.stopBannerAutoSlide();
                } else {
                    this.startBannerAutoSlide();
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    // 필요시 모달 닫기 등
                }
            });

            window.addEventListener('error', (e) => {
                console.error('Runtime error:', e.error);
            });

            window.addEventListener('unhandledrejection', (e) => {
                console.error('Unhandled promise rejection:', e.reason);
            });
        },

        showError(message) {
            utils.hideSection('initialLoading');
            utils.setElementContent('#errorMessage', message);
            utils.showSection('errorSection');
        }
    };

    // 🚀 메인 초기화 함수
    async function initNofeeMain() {
        try {
            console.log('🚀 노피 메인페이지 v3.2 초기화 시작 (창의적 기능 중심)');
            
            await dataLoader.loadAllData();
            
            window.nofeeState = state;
            
            console.log('✅ 노피 메인페이지 v3.2 초기화 완료');
            
            window.dispatchEvent(new CustomEvent('nofeeMainReady', {
                detail: { 
                    version: '3.2', 
                    timestamp: Date.now(),
                    dataLoaded: state.isDataLoaded,
                    errors: state.loadingErrors
                }
            }));
            
        } catch (error) {
            console.error('❌ Critical initialization failure:', error);
            dataLoader.showError('시스템 초기화에 실패했습니다');
        }
    }

    // 🎯 DOM 준비 확인 및 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNofeeMain);
    } else {
        setTimeout(initNofeeMain, 0);
    }

    // 정리 작업
    window.addEventListener('beforeunload', () => {
        if (state.bannerInterval) {
            clearInterval(state.bannerInterval);
        }
    });

})();
