// 🚀 노피 메인페이지 스크립트 v4.0 - 창의적 기능 강화
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
        selectedRegion: null,
        currentBannerIndex: 0,
        bannerInterval: null,
        hotDealsInterval: null,
        isDataLoaded: false,
        loadingErrors: [],
        currentHotDealIndex: 0,
        analytics: {
            totalProducts: 0,
            avgDiscount: 0,
            maxSavings: 0,
            topBrands: []
        }
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

        formatNumber: (value) => {
            return Math.abs(Number(value)).toLocaleString("ko-KR");
        },

        debounce: (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
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
        },

        // 텍스트에서 키워드 추출
        extractKeywords: (text) => {
            const stopWords = ['이', '가', '을', '를', '의', '에', '와', '과', '도', '는', '은', '이다', '있다', '없다', '하다', '되다', '그리고', '하지만', '그런데', '그래서'];
            const words = text.replace(/[^\w\s가-힣]/g, '').split(/\s+/)
                .filter(word => word.length > 1 && !stopWords.includes(word))
                .map(word => word.toLowerCase());
            
            const frequency = {};
            words.forEach(word => {
                frequency[word] = (frequency[word] || 0) + 1;
            });
            
            return Object.entries(frequency)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([word]) => word);
        },

        // 감정 분석 (간단한 키워드 기반)
        analyzeSentiment: (text) => {
            const positiveWords = ['좋다', '만족', '빠르다', '친절', '저렴', '추천', '최고', '완벽', '훌륭', '감사'];
            const negativeWords = ['나쁘다', '불만', '느리다', '불친절', '비싸다', '실망', '최악', '문제', '고장', '후회'];
            
            const lowerText = text.toLowerCase();
            let positiveScore = 0;
            let negativeScore = 0;
            
            positiveWords.forEach(word => {
                if (lowerText.includes(word)) positiveScore++;
            });
            
            negativeWords.forEach(word => {
                if (lowerText.includes(word)) negativeScore++;
            });
            
            if (positiveScore > negativeScore) return 'positive';
            if (negativeScore > positiveScore) return 'negative';
            return 'neutral';
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
                    this.fetchData(DATA_URLS.products, 'products', true).then(data => state.products = data || []),
                    this.fetchData(DATA_URLS.reviews, 'reviews', true).then(data => state.reviews = data || [])
                ]);
                
                // 데이터 분석 수행
                this.performDataAnalysis();
                
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

        performDataAnalysis() {
            if (state.products.length === 0) return;
            
            console.log('📊 데이터 분석 시작...');
            
            // 기본 통계 계산
            state.analytics.totalProducts = state.products.length;
            
            // 할인율 계산
            const discounts = state.products.map(product => {
                const { discountRate } = this.calculateDiscount(product.model, product.principal);
                return discountRate;
            }).filter(rate => rate > 0);
            
            state.analytics.avgDiscount = discounts.length > 0 ? 
                Math.round(discounts.reduce((sum, rate) => sum + rate, 0) / discounts.length) : 0;
            
            // 최대 절약 금액 계산
            const savings = state.products.map(product => {
                const { discount } = this.calculateDiscount(product.model, product.principal);
                return discount;
            });
            
            state.analytics.maxSavings = savings.length > 0 ? Math.max(...savings) : 0;
            
            // 브랜드별 통계
            const brandStats = {};
            state.products.forEach(product => {
                const brand = product.brand;
                if (!brandStats[brand]) {
                    brandStats[brand] = { count: 0, totalDiscount: 0 };
                }
                brandStats[brand].count++;
                const { discountRate } = this.calculateDiscount(product.model, product.principal);
                brandStats[brand].totalDiscount += discountRate;
            });
            
            state.analytics.topBrands = Object.entries(brandStats)
                .map(([brand, stats]) => ({
                    brand,
                    count: stats.count,
                    avgDiscount: Math.round(stats.totalDiscount / stats.count)
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3);
            
            console.log('📊 분석 완료:', state.analytics);
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
                    product: "https://nofee.team/ai",
                    brand: "https://nofee.team/more"
                }
            };
        },

        updateBasicUI() {
            if (!state.config) return;
            
            const config = state.config;
            
            // 사이트 제목 업데이트
            if (config.site?.title) {
                document.title = config.site.title;
            }
            
            // CSS 변수 업데이트 (테마 색상)
            if (config.theme) {
                const root = document.documentElement;
                Object.entries(config.theme).forEach(([key, value]) => {
                    root.style.setProperty(`--site-${key}`, value);
                });
            }
        },

        async initializeAllSections() {
            try {
                // 순차적으로 섹션 초기화 (에러가 발생해도 다음 섹션 계속)
                await this.safeInit('Hero', () => this.initHeroSection());
                await this.safeInit('Banner', () => this.initBannerSection());
                await this.safeInit('HotDeals', () => this.initHotDealsSection());
                await this.safeInit('Analytics', () => this.initAnalyticsSection());
                await this.safeInit('AI', () => this.initAISection());
                await this.safeInit('Products', () => this.initProductsSection());
                await this.safeInit('Reviews', () => this.initReviewsSection());
                
                // 애니메이션 및 인터랙션 초기화
                this.initAnimations();
                this.initEventListeners();
                
                console.log('🎉 All sections initialized successfully');
                
            } catch (error) {
                console.error('❌ Section initialization failed:', error);
                // 에러가 발생해도 계속 진행
            }
        },

        async safeInit(sectionName, initFunction) {
            try {
                await initFunction();
                console.log(`✅ ${sectionName} section initialized`);
            } catch (error) {
                console.error(`❌ ${sectionName} section failed:`, error);
                // 에러가 발생해도 다른 섹션은 계속 초기화
            }
        },

        async initHeroSection() {
            if (!state.config?.hero) return;
            
            const { hero } = state.config;
            
            // Hero 텍스트 업데이트
            utils.setElementContent('#heroTitle', hero.title, true);
            utils.setElementContent('#heroSubtitle', hero.subtitle);
            
            // Hero features 생성
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
                // 기본 배너 사용
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
                // 슬라이드 생성
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
                
                // 인디케이터 생성
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

        async initHotDealsSection() {
            if (!state.products || state.products.length === 0) {
                console.log('⚠️ No products data, skipping hot deals section');
                return;
            }
            
            // 할인율 높은 상품들을 HOT 딜로 선별
            const hotDeals = state.products
                .map(product => {
                    const { discountRate } = this.calculateDiscount(product.model, product.principal);
                    return { ...product, discountRate };
                })
                .filter(product => product.discountRate > 0)
                .sort((a, b) => b.discountRate - a.discountRate)
                .slice(0, 6); // 상위 6개만 선택
            
            if (hotDeals.length === 0) {
                console.log('⚠️ No discounted products found');
                return;
            }
            
            // HOT 딜 카루셀 렌더링
            this.renderHotDeals(hotDeals);
            
            // 타이머 시작
            this.startHotDealsTimer();
            
            utils.showSection('hotDealsSection');
        },

        async initAnalyticsSection() {
            if (!state.analytics || state.analytics.totalProducts === 0) {
                console.log('⚠️ No analytics data available');
                return;
            }
            
            const analyticsGrid = document.getElementById('analyticsGrid');
            if (!analyticsGrid) return;
            
            analyticsGrid.innerHTML = '';
            
            // 통계 카드들 생성
            const stats = [
                {
                    icon: '📱',
                    value: utils.formatNumber(state.analytics.totalProducts),
                    label: '전체 상품',
                    change: null
                },
                {
                    icon: '💰',
                    value: `${state.analytics.avgDiscount}%`,
                    label: '평균 할인율',
                    change: state.analytics.avgDiscount > 30 ? 'positive' : null
                },
                {
                    icon: '🎯',
                    value: utils.formatKRW(state.analytics.maxSavings),
                    label: '최대 절약 금액',
                    change: 'positive'
                }
            ];
            
            // 브랜드별 통계 추가
            if (state.analytics.topBrands.length > 0) {
                const topBrand = state.analytics.topBrands[0];
                stats.push({
                    icon: '🏆',
                    value: topBrand.brand,
                    label: '최다 상품 브랜드',
                    change: null
                });
            }
            
            stats.forEach((stat, index) => {
                const statCard = utils.createElement('div', 'stat-card');
                statCard.style.opacity = '0';
                statCard.style.transform = 'translateY(20px)';
                
                statCard.innerHTML = `
                    <div class="stat-icon">${stat.icon}</div>
                    <div class="stat-value">${stat.value}</div>
                    <div class="stat-label">${stat.label}</div>
                    ${stat.change ? `<div class="stat-change ${stat.change}">↗ 우수</div>` : ''}
                `;
                
                analyticsGrid.appendChild(statCard);
                
                // 스태거드 애니메이션
                setTimeout(() => {
                    statCard.style.opacity = '1';
                    statCard.style.transform = 'translateY(0)';
                    statCard.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                }, index * 150);
            });
            
            utils.showSection('analyticsSection');
        },

        async initAISection() {
            if (!state.config?.ai) return;
            
            const { ai } = state.config;
            
            // AI 섹션 텍스트 업데이트
            utils.setElementContent('#aiBadgeText', ai.badgeText || '노피 AI');
            utils.setElementContent('#aiTitle', ai.title, true);
            utils.setElementContent('#aiDescription', ai.description, true);
            utils.setElementContent('#aiCtaText', ai.ctaText || 'AI 상담 시작');
            
            // AI features 생성
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
            
            // AI CTA 클릭 이벤트
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

        async initProductsSection() {
            if (!state.products || state.products.length === 0) {
                console.log('⚠️ No products data, skipping products section');
                return;
            }
            
            // 섹션 제목 업데이트
            if (state.config?.products) {
                utils.setElementContent('#productsTitle', state.config.products.title || '지금 가장 인기있는 상품');
                utils.setElementContent('#productsSubtitle', state.config.products.subtitle || '할인율 높은 순으로 AI가 엄선한 추천 상품');
                utils.setElementContent('#loadMoreText', state.config.products.loadMoreText || '전체 상품 보기');
            }
            
            // 상품 렌더링
            this.renderProducts();
            
            // 전체 상품 보기 버튼 이벤트
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
            
            // 섹션 제목 업데이트
            if (state.config?.reviews) {
                utils.setElementContent('#reviewsTitle', state.config.reviews.title || '실시간 고객 후기');
                utils.setElementContent('#reviewsSubtitle', state.config.reviews.subtitle || '실제 구매 고객들의 생생한 경험담');
            }
            
            // 평점 통계 계산 및 표시
            this.updateReviewStats();
            
            // 리뷰 렌더링
            this.renderReviews();
            
            // 리뷰 분석 렌더링
            this.renderReviewAnalytics();
            
            utils.showSection('reviewsSection');
        },

        renderHotDeals(hotDeals) {
            const dealsCarousel = document.getElementById('dealsCarousel');
            if (!dealsCarousel) return;
            
            dealsCarousel.innerHTML = '';
            
            hotDeals.forEach((deal, index) => {
                const { discount, discountRate, originPrice } = this.calculateDiscount(deal.model, deal.principal);
                const modelInfo = state.models[deal.model] || {};
                
                const dealCard = utils.createElement('div', 'deal-card');
                dealCard.style.opacity = '0';
                dealCard.style.transform = 'translateY(20px)';
                
                dealCard.innerHTML = `
                    <div class="deal-badge">${discountRate}% OFF</div>
                    <div class="deal-content">
                        <div class="deal-model">${utils.sanitizeHTML(deal.model)}</div>
                        <div class="deal-price">${utils.formatKRW(deal.total)}</div>
                        <div class="deal-original-price">${utils.formatKRW(originPrice)}</div>
                        <div class="deal-specs">
                            <span class="spec-tag">${utils.sanitizeHTML(deal.carrier)}</span>
                            <span class="spec-tag">${utils.sanitizeHTML(deal.type)}</span>
                            ${modelInfo.storage ? `<span class="spec-tag">${modelInfo.storage}</span>` : ''}
                        </div>
                        <div class="deal-timer">⏰ 한정 특가</div>
                    </div>
                `;
                
                dealCard.addEventListener('click', () => {
                    this.handleProductClick(deal);
                });
                
                dealsCarousel.appendChild(dealCard);
                
                // 스태거드 애니메이션
                setTimeout(() => {
                    dealCard.style.opacity = '1';
                    dealCard.style.transform = 'translateY(0)';
                    dealCard.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                }, index * 100);
            });
        },

        startHotDealsTimer() {
            const timerDisplay = document.getElementById('dealTimer');
            if (!timerDisplay) return;
            
            let minutes = 59;
            let seconds = 59;
            
            const updateTimer = () => {
                timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                if (seconds === 0) {
                    if (minutes === 0) {
                        minutes = 59;
                        seconds = 59;
                        // 딜 갱신 효과
                        const dealsCarousel = document.getElementById('dealsCarousel');
                        if (dealsCarousel) {
                            dealsCarousel.style.opacity = '0.7';
                            setTimeout(() => {
                                dealsCarousel.style.opacity = '1';
                            }, 500);
                        }
                    } else {
                        minutes--;
                        seconds = 59;
                    }
                } else {
                    seconds--;
                }
            };
            
            updateTimer();
            state.hotDealsInterval = setInterval(updateTimer, 1000);
        },

        renderProducts() {
            const loadingElement = document.getElementById('productsLoading');
            const gridElement = document.getElementById('productsGrid');
            
            if (!loadingElement || !gridElement) return;
            
            // 상품 필터링 및 정렬
            const filteredProducts = this.filterAndSortProducts();
            
            // 로딩 숨기고 그리드 표시
            loadingElement.style.display = 'none';
            gridElement.style.display = 'grid';
            gridElement.innerHTML = '';
            
            // 상품이 없을 경우
            if (filteredProducts.length === 0) {
                gridElement.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--gray-500);">표시할 상품이 없습니다.</div>';
                return;
            }
            
            // 상품 카드 생성
            filteredProducts.slice(0, 4).forEach((product, index) => {
                const card = this.createProductCard(product);
                gridElement.appendChild(card);
                
                // 스태거드 애니메이션
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 150);
            });
        },

        filterAndSortProducts() {
            return state.products
                .filter(product => {
                    // 기본 필터링
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

        createProductCard(product) {
            const brandInfo = this.getBrandInfo(product.brand);
            const { discount, discountRate, originPrice } = this.calculateDiscount(product.model, product.principal);
            const modelInfo = state.models[product.model] || {};
            
            const card = utils.createElement('div', 'product-card');
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            
            const supportText = this.getSupportText(product.support);
            
            card.innerHTML = `
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

                <div class="product-details">
                    <div class="details-grid">
                        ${modelInfo.storage ? `
                            <div class="detail-item">
                                <span class="detail-label">용량</span>
                                <span class="detail-value">${modelInfo.storage}</span>
                            </div>
                        ` : ''}
                        ${modelInfo.releaseDate ? `
                            <div class="detail-item">
                                <span class="detail-label">출시일</span>
                                <span class="detail-value">${modelInfo.releaseDate}</span>
                            </div>
                        ` : ''}
                        ${product.plan_period ? `
                            <div class="detail-item">
                                <span class="detail-label">약정기간</span>
                                <span class="detail-value">${product.plan_period}</span>
                            </div>
                        ` : ''}
                        ${product.plan_name ? `
                            <div class="detail-item">
                                <span class="detail-label">요금제</span>
                                <span class="detail-value">${product.plan_name}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="price-section">
                    <div class="original-price">
                        <span class="price-original">${utils.formatKRW(originPrice)}</span>
                        ${discountRate > 0 ? `<span class="discount-badge">${discountRate}% 할인</span>` : ''}
                    </div>
                    ${discount > 0 ? `<div class="discount-amount">- ${utils.formatKRW(discount)} 할인</div>` : ''}
                </div>
                
                <div class="final-price">
                    <div class="price-label">월 납부금 (기기값 + 요금제)</div>
                    <div class="price-value">${utils.formatKRW(product.total)}</div>
                </div>
            `;
            
            // 클릭 이벤트
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
                
                // 스태거드 애니메이션
                setTimeout(() => {
                    reviewCard.style.opacity = '1';
                    reviewCard.style.transform = 'translateY(0)';
                    reviewCard.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                }, index * 100);
            });
            
            // 자동 스크롤 시작
            this.startReviewAutoScroll();
        },

        renderReviewAnalytics() {
            const keywordCloud = document.getElementById('keywordCloud');
            const sentimentBars = document.getElementById('sentimentBars');
            
            if (!keywordCloud || !sentimentBars) return;
            
            // 키워드 추출
            const allComments = state.reviews.map(review => review.comment).join(' ');
            const keywords = utils.extractKeywords(allComments);
            
            keywordCloud.innerHTML = '';
            keywords.slice(0, 8).forEach(keyword => {
                const keywordTag = utils.createElement('span', 'keyword-tag', keyword);
                keywordCloud.appendChild(keywordTag);
            });
            
            // 감정 분석
            const sentiments = { positive: 0, neutral: 0, negative: 0 };
            state.reviews.forEach(review => {
                const sentiment = utils.analyzeSentiment(review.comment);
                sentiments[sentiment]++;
            });
            
            const total = state.reviews.length;
            const positivePercent = Math.round((sentiments.positive / total) * 100);
            const neutralPercent = Math.round((sentiments.neutral / total) * 100);
            const negativePercent = Math.round((sentiments.negative / total) * 100);
            
            sentimentBars.innerHTML = `
                <div class="sentiment-bar">
                    <div class="sentiment-label">긍정</div>
                    <div class="sentiment-value sentiment-positive" style="width: ${positivePercent}%"></div>
                    <div class="sentiment-percent">${positivePercent}%</div>
                </div>
                <div class="sentiment-bar">
                    <div class="sentiment-label">중립</div>
                    <div class="sentiment-value sentiment-neutral" style="width: ${neutralPercent}%"></div>
                    <div class="sentiment-percent">${neutralPercent}%</div>
                </div>
                <div class="sentiment-bar">
                    <div class="sentiment-label">부정</div>
                    <div class="sentiment-value sentiment-negative" style="width: ${negativePercent}%"></div>
                    <div class="sentiment-percent">${negativePercent}%</div>
                </div>
            `;
        },

        updateReviewStats() {
            const ratingSummary = document.getElementById('ratingSummary');
            if (!ratingSummary || !state.reviews.length) return;
            
            // 평점 통계 계산
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
            
            // 부분 매칭
            for (const [key, value] of Object.entries(state.models)) {
                if (model.includes(key) || key.includes(model)) {
                    return value.originPrice;
                }
            }
            
            // 기본값
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
                model: product.model || "",
                carrier: product.carrier || "",
                type: product.type || "",
                support: product.support || "",
                brand: product.brand || "",
                principal: product.principal || 0,
                plan_name: product.plan_name || "",
                plan_period: product.plan_period || "",
                plan: product.plan || 0,
                installment: product.installment || 0,
                total: product.total || 0
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
            
            // 이벤트 리스너
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
            // 페이지 가시성 변경 처리
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.stopBannerAutoSlide();
                    if (state.hotDealsInterval) {
                        clearInterval(state.hotDealsInterval);
                    }
                } else {
                    this.startBannerAutoSlide();
                    this.startHotDealsTimer();
                }
            });

            // 키보드 접근성
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    // 필요시 모달 닫기 등
                }
            });

            // 에러 발생 시 처리
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
            console.log('🚀 노피 메인페이지 v4.0 초기화 시작 (창의적 기능 강화)');
            
            // 모든 데이터 로드 및 UI 초기화
            await dataLoader.loadAllData();
            
            // 전역 함수 등록 (웹플로우 호환성)
            window.nofeeState = state;
            
            console.log('✅ 노피 메인페이지 v4.0 초기화 완료');
            
            // 초기화 완료 이벤트
            window.dispatchEvent(new CustomEvent('nofeeMainReady', {
                detail: { 
                    version: '4.0', 
                    timestamp: Date.now(),
                    dataLoaded: state.isDataLoaded,
                    errors: state.loadingErrors,
                    analytics: state.analytics
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
        if (state.hotDealsInterval) {
            clearInterval(state.hotDealsInterval);
        }
    });

})();
