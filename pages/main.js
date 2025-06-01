// 🚀 노피 메인페이지 스크립트 - GitHub 관리용
(function() {
    'use strict';
    
    // 🎯 전역 상태 관리
    let allProducts = [];
    let currentBannerIndex = 0;
    let bannerInterval;
    let configData = {};
    let modelsData = {};
    let brandsData = {};

    // GitHub 저장소 설정
    const GITHUB_BASE_URL = 'https://jacob-po.github.io/nofee-webflow';
    const PRODUCTS_DATA_URL = 'https://raw.githubusercontent.com/jacob-po/products-data/refs/heads/main/products.json';
    const REVIEWS_DATA_URL = `${GITHUB_BASE_URL}/data/review.json`;
    const BANNERS_DATA_URL = `${GITHUB_BASE_URL}/data/banners.json`;
    const BRANDS_DATA_URL = `${GITHUB_BASE_URL}/data/brands.json`;
    const MODELS_DATA_URL = `${GITHUB_BASE_URL}/data/models.json`;
    const CONFIG_DATA_URL = `${GITHUB_BASE_URL}/data/config.json`;

    // 🎨 유틸리티 함수들
    const formatKRW = (value) => {
        return Math.abs(Number(value)).toLocaleString("ko-KR") + "원";
    };

    // 브랜드명 매핑
    const brandNameMap = {
        'Samsung': '삼성',
        'Apple': '애플',
        'SAMSUNG': '삼성',
        'APPLE': '애플'
    };

    const getBrandInfo = (brand) => {
        const mappedBrand = brandNameMap[brand] || brand;
        const brandData = brandsData[mappedBrand];
        
        if (brandData) {
            return {
                icon: brandData.icon,
                class: brandData.class,
                displayName: mappedBrand,
                ...brandData
            };
        }
        
        // 기본값
        switch(mappedBrand) {
            case '삼성': return { icon: 'S', class: 'samsung', displayName: '삼성' };
            case '애플': return { icon: 'A', class: 'apple', displayName: '애플' };
            default: return { icon: '📱', class: 'etc', displayName: brand };
        }
    };

    // 출고가 가져오기
    const getOriginPrice = (model) => {
        // modelsData에서 모델명으로 출고가 검색
        const modelInfo = modelsData[model];
        if (modelInfo && modelInfo.originPrice) {
            return modelInfo.originPrice;
        }

        // 부분 매칭으로 검색
        for (const [key, value] of Object.entries(modelsData)) {
            if (model.includes(key) || key.includes(model)) {
                return value.originPrice;
            }
        }

        // 기본값
        return 1000000;
    };

    const calculateDiscount = (model, principal) => {
        const originPrice = getOriginPrice(model);
        const discount = Math.abs(principal);
        const discountRate = Math.round((discount / originPrice) * 100);
        return { discount, discountRate, originPrice };
    };

    // 🚀 초기 데이터 로드
    async function loadInitialData() {
        try {
            // 모든 설정 데이터를 병렬로 로드
            const [configRes, modelsRes, brandsRes] = await Promise.all([
                fetch(CONFIG_DATA_URL).catch(() => null),
                fetch(MODELS_DATA_URL).catch(() => null),
                fetch(BRANDS_DATA_URL).catch(() => null)
            ]);

            if (configRes && configRes.ok) {
                configData = await configRes.json();
            }
            if (modelsRes && modelsRes.ok) {
                modelsData = await modelsRes.json();
            }
            if (brandsRes && brandsRes.ok) {
                brandsData = await brandsRes.json();
            }
        } catch (error) {
            console.error('초기 데이터 로드 실패:', error);
        }
    }

    // 🚀 배너 슬라이더
    async function initBanner() {
        const track = document.getElementById('bannerTrack');
        const indicators = document.querySelector('.banner-indicators');
        
        if (!track || !indicators) return;

        try {
            // GitHub에서 배너 데이터 로드
            const response = await fetch(BANNERS_DATA_URL);
            if (!response.ok) throw new Error('배너 데이터 로드 실패');
            
            const banners = await response.json();
            
            // 배너 슬라이드 생성
            track.innerHTML = '';
            indicators.innerHTML = '';
            
            banners.forEach((banner, index) => {
                // 슬라이드 생성
                const slide = document.createElement('div');
                slide.className = 'banner-slide';
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
                const indicator = document.createElement('div');
                indicator.className = index === 0 ? 'indicator active' : 'indicator';
                indicators.appendChild(indicator);
            });

            const slideCount = banners.length;

            function goToSlide(index) {
                currentBannerIndex = index;
                track.style.transform = `translateX(-${currentBannerIndex * 100}%)`;
                
                const allIndicators = indicators.querySelectorAll('.indicator');
                allIndicators.forEach((indicator, i) => {
                    indicator.classList.toggle('active', i === currentBannerIndex);
                });
            }

            function nextSlide() {
                const nextIndex = (currentBannerIndex + 1) % slideCount;
                goToSlide(nextIndex);
            }

            function startAutoSlide() {
                bannerInterval = setInterval(nextSlide, 4000);
            }

            function stopAutoSlide() {
                if (bannerInterval) {
                    clearInterval(bannerInterval);
                    bannerInterval = null;
                }
            }

            // 인디케이터 클릭 이벤트
            const allIndicators = indicators.querySelectorAll('.indicator');
            allIndicators.forEach((indicator, index) => {
                indicator.addEventListener('click', () => {
                    goToSlide(index);
                    stopAutoSlide();
                    setTimeout(startAutoSlide, 2000);
                });
            });

            // 터치 스와이프 지원
            let startX = 0;
            let endX = 0;

            track.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                stopAutoSlide();
            }, { passive: true });

            track.addEventListener('touchend', (e) => {
                endX = e.changedTouches[0].clientX;
                const diff = startX - endX;
                
                if (Math.abs(diff) > 50) {
                    if (diff > 0) {
                        nextSlide();
                    } else {
                        const prevIndex = currentBannerIndex === 0 ? slideCount - 1 : currentBannerIndex - 1;
                        goToSlide(prevIndex);
                    }
                }
                
                setTimeout(startAutoSlide, 2000);
            }, { passive: true });

            // 마우스 호버 시 자동 슬라이드 중지
            track.addEventListener('mouseenter', stopAutoSlide);
            track.addEventListener('mouseleave', startAutoSlide);

            startAutoSlide();

            // 페이지 가시성 변경 시 처리
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    stopAutoSlide();
                } else {
                    startAutoSlide();
                }
            });

        } catch (error) {
            console.error('배너 로드 실패:', error);
            // 에러 시 기본 배너 표시
            track.innerHTML = `
                <div class="banner-slide">
                    <div class="slide-content">
                        <div class="slide-text">
                            <h3>전국 어디서나<br><strong>성지 가격</strong>으로 드립니다</h3>
                            <p>오직 노피 입점 대리점에서만</p>
                        </div>
                        <div class="slide-visual">🚀</div>
                    </div>
                </div>
            `;
        }
    }

    // 🏆 상품 카드 생성
    function createProductCard(product) {
        const brandInfo = getBrandInfo(product.brand);
        const { discount, discountRate, originPrice } = calculateDiscount(product.model, product.principal);
        
        const card = document.createElement('div');
        card.className = 'product-card';
        
        card.innerHTML = `
            <div class="product-header">
                <div class="brand-icon ${brandInfo.class}">${brandInfo.icon}</div>
                <div class="product-info">
                    <h4>${product.model}</h4>
                    <div class="product-meta">
                        <span class="meta-tag">${product.carrier}</span>
                        <span class="meta-tag">${product.type}</span>
                        <span class="meta-tag">${product.support === 'O' ? '지원금O' : '지원금X'}</span>
                    </div>
                </div>
            </div>
            
            <div class="price-section">
                <div class="original-price">
                    <span class="price-original">${formatKRW(originPrice)}</span>
                    <span class="discount-badge">${discountRate}% 할인</span>
                </div>
                <div class="discount-amount">- ${formatKRW(discount)} 할인</div>
            </div>
            
            <div class="final-price">
                <div class="price-label">월 납부금 (기기값 + 요금제)</div>
                <div class="price-value">${formatKRW(product.total)}</div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            const params = new URLSearchParams({
                model: product.model || "",
                carrier: product.carrier || "",
                type: product.type || "",
                support: product.support || "",
                brand: brandInfo.displayName || "",
                principal: product.principal || 0,
                plan_name: product.plan_name || "",
                plan_period: product.plan_period || "",
                plan: product.plan || 0,
                installment: product.installment || 0,
                total: product.total || 0
            });
            window.open('https://nofee.team/ai?' + params.toString(), '_blank');
        });
        
        return card;
    }

    // 🏆 베스트 상품 로드
    async function loadBestProducts() {
        const loadingElement = document.getElementById('productsLoading');
        const gridElement = document.getElementById('productsGrid');
        
        if (!loadingElement || !gridElement) return;
        
        try {
            const response = await fetch(PRODUCTS_DATA_URL);
            
            if (!response.ok) {
                throw new Error('데이터를 불러올 수 없습니다');
            }
            
            const data = await response.json();
            allProducts = data;
            
            // 상품 필터링 및 정렬
            const filteredProducts = data
                .filter(product => {
                    // 브랜드 필터링
                    const brandInfo = getBrandInfo(product.brand);
                    if (!['삼성', '애플'].includes(brandInfo.displayName)) return false;
                    
                    // 총액이 너무 낮은 상품 제외
                    if (product.total < 30000) return false;
                    
                    // principal이 양수인 경우 (할인이 없는 경우) 제외
                    if (product.principal >= 0) return false;
                    
                    return true;
                })
                .map(product => {
                    const { discountRate } = calculateDiscount(product.model, product.principal);
                    return { ...product, discountRate };
                })
                .sort((a, b) => b.discountRate - a.discountRate);
            
            // 삼성과 애플 각각 할인율 높은 상품 2개씩
            const samsungProducts = filteredProducts
                .filter(p => getBrandInfo(p.brand).displayName === '삼성')
                .slice(0, 2);
                
            const appleProducts = filteredProducts
                .filter(p => getBrandInfo(p.brand).displayName === '애플')
                .slice(0, 2);
            
            const bestProducts = [...samsungProducts, ...appleProducts];
            
            // 로딩 숨기고 그리드 표시
            loadingElement.style.display = 'none';
            gridElement.style.display = 'grid';
            
            // 상품 카드 생성
            gridElement.innerHTML = '';
            bestProducts.forEach(product => {
                const card = createProductCard(product);
                gridElement.appendChild(card);
            });
            
            // 브랜드 섹션 통계 업데이트
            updateBrandSection();
            
        } catch (error) {
            console.error('상품 데이터 로딩 실패:', error);
            loadingElement.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--gray-500);">
                    <p>⚠️ 상품을 불러올 수 없어요</p>
                    <button onclick="loadBestProducts()" style="margin-top: 12px; padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 6px; cursor: pointer;">다시 시도</button>
                </div>
            `;
        }
    }

    // 📱 리뷰 데이터 및 렌더링
    async function loadReviews() {
        const reviewsScroll = document.getElementById('reviewsScroll');
        
        if (!reviewsScroll) return;
        
        try {
            // GitHub에서 리뷰 데이터 가져오기
            const response = await fetch(REVIEWS_DATA_URL);
            
            if (!response.ok) {
                throw new Error('리뷰 데이터를 불러올 수 없습니다');
            }
            
            const reviews = await response.json();
            
            reviewsScroll.innerHTML = '';
            
            reviews.forEach(review => {
                const stars = '⭐'.repeat(Math.floor(review.rating));
                
                const reviewCard = document.createElement('div');
                reviewCard.className = 'review-card';
                
                // 하이라이트 처리
                let comment = review.comment;
                if (review.highlight) {
                    comment = comment.replace(review.highlight, `<span class='review-highlight'>${review.highlight}</span>`);
                }
                
                reviewCard.innerHTML = `
                    <div class="review-header">
                        <div class="reviewer-avatar">${review.initial}</div>
                        <div class="reviewer-info">
                            <h5>${review.name}</h5>
                            <div class="review-rating">${stars} ${review.rating}</div>
                        </div>
                    </div>
                    <div class="review-product">${review.product}</div>
                    <div class="review-text">${comment}</div>
                `;
                
                reviewsScroll.appendChild(reviewCard);
            });
            
            // 자동 스크롤 기능
            let scrollPosition = 0;
            const scrollStep = 296;
            let autoScrollInterval;
            let userInteracting = false;
            
            function autoScroll() {
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
            }
            
            function startAutoScroll() {
                autoScrollInterval = setInterval(() => {
                    if (!userInteracting) {
                        autoScroll();
                    }
                }, 3000);
            }
            
            function stopAutoScroll() {
                if (autoScrollInterval) {
                    clearInterval(autoScrollInterval);
                    autoScrollInterval = null;
                }
            }
            
            // 사용자 인터랙션 감지
            reviewsScroll.addEventListener('touchstart', () => {
                userInteracting = true;
                stopAutoScroll();
            }, { passive: true });
            
            reviewsScroll.addEventListener('touchend', () => {
                userInteracting = false;
                setTimeout(startAutoScroll, 2000);
            }, { passive: true });
            
            reviewsScroll.addEventListener('mouseenter', () => {
                userInteracting = true;
                stopAutoScroll();
            });
            
            reviewsScroll.addEventListener('mouseleave', () => {
                userInteracting = false;
                setTimeout(startAutoScroll, 1000);
            });
            
            startAutoScroll();
            
            // 페이지 가시성 변경 시 처리
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    stopAutoScroll();
                } else if (!userInteracting) {
                    startAutoScroll();
                }
            });
            
        } catch (error) {
            console.error('리뷰 로딩 실패:', error);
            // 에러 시 빈 상태 표시
            reviewsScroll.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--gray-500);">리뷰를 불러올 수 없습니다.</div>';
        }
    }

    // 🏢 브랜드 통계 계산
    function calculateBrandStats() {
        const brandStats = {
            '삼성': { maxDiscount: 0, popularModel: '', count: 0 },
            '애플': { maxDiscount: 0, popularModel: '', count: 0 }
        };

        if (allProducts.length === 0) return brandStats;

        // 브랜드별 통계 계산
        allProducts.forEach(product => {
            const brandInfo = getBrandInfo(product.brand);
            const brandName = brandInfo.displayName;
            
            if (brandName === '삼성' || brandName === '애플') {
                const { discountRate } = calculateDiscount(product.model, product.principal);
                
                if (discountRate > brandStats[brandName].maxDiscount) {
                    brandStats[brandName].maxDiscount = discountRate;
                    brandStats[brandName].popularModel = product.model;
                }
                brandStats[brandName].count++;
            }
        });

        return brandStats;
    }

    // 🏢 브랜드 섹션 업데이트
    async function updateBrandSection() {
        const brandStats = calculateBrandStats();
        
        // 브랜드 카드를 GitHub 데이터로 업데이트
        const brandGrid = document.querySelector('.brand-grid');
        if (!brandGrid) return;

        try {
            // brandsData가 이미 로드되어 있으면 사용
            if (Object.keys(brandsData).length > 0) {
                brandGrid.innerHTML = '';
                
                ['삼성', '애플'].forEach(brandName => {
                    const brand = brandsData[brandName];
                    if (!brand) return;
                    
                    const stats = brandStats[brandName];
                    const popularModel = stats.popularModel || brand.defaultModel || '';
                    const maxDiscount = stats.maxDiscount || brand.defaultDiscount || 0;
                    
                    const brandCard = document.createElement('div');
                    brandCard.className = 'brand-card';
                    brandCard.onclick = () => selectBrand(brandName);
                    
                    brandCard.innerHTML = `
                        <div class="brand-logo">
                            <img src="${brand.logo}" alt="${brandName}" loading="lazy">
                        </div>
                        <h4>${brandName}</h4>
                        <p>${brand.description}</p>
                        <div class="brand-stats">
                            <div class="stat-row">
                                <span class="stat-label">인기 모델</span>
                                <span class="stat-value">${popularModel.replace('갤럭시 ', '')}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">최대 할인</span>
                                <span class="stat-value highlight">${maxDiscount}%</span>
                            </div>
                        </div>
                        <div class="brand-arrow">›</div>
                    `;
                    
                    brandGrid.appendChild(brandCard);
                });
            }
        } catch (error) {
            console.error('브랜드 섹션 업데이트 실패:', error);
        }
    }

    // 🏢 브랜드 선택 함수
    function selectBrand(brand) {
        const clickedCard = event.currentTarget;
        if (clickedCard) {
            clickedCard.style.transform = 'translateY(-2px) scale(0.98)';
            clickedCard.style.transition = 'transform 0.15s ease';
        }

        setTimeout(() => {
            const url = new URL('https://nofee.team/more');
            url.searchParams.set('brand', brand);
            window.open(url.toString(), '_blank');
        }, 150);
    }

    // 애니메이션 초기화
    function initAnimations() {
        const sections = document.querySelectorAll('.nofee-section');
        
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry, index) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.classList.add('visible');
                        }, index * 100);
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
            // IntersectionObserver를 지원하지 않는 경우 바로 표시
            sections.forEach(section => {
                section.classList.add('visible');
            });
        }
    }

    // AI CTA 클릭 이벤트 설정
    function initAICTA() {
        const aiCTA = document.querySelector('.ai-cta-card');
        if (aiCTA) {
            aiCTA.addEventListener('click', () => {
                window.open('https://www.nofee.team/ai', '_blank');
            });
        }
    }

    // 로드 더 버튼 이벤트 설정
    function initLoadMoreButton() {
        const loadMoreBtn = document.querySelector('.load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                window.open('https://nofee.team/more', '_blank');
            });
        }
    }

    // 에러 핸들링
    function handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
    }

    // 디바운스 함수
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 성능 최적화
    function optimizePerformance() {
        // 이미지 지연 로딩
        if ('loading' in HTMLImageElement.prototype) {
            const images = document.querySelectorAll('img[data-src]');
            images.forEach(img => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            });
        }

        // 스크롤 이벤트 최적화
        const debouncedScroll = debounce(() => {
            const scrollTop = window.pageYOffset;
            const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = (scrollTop / documentHeight) * 100;
            
            if (scrollPercent > 10) {
                document.body.classList.add('scrolled');
            } else {
                document.body.classList.remove('scrolled');
            }
        }, 16);
        
        window.addEventListener('scroll', debouncedScroll, { passive: true });
    }

    // 접근성 개선
    function improveAccessibility() {
        // 키보드 네비게이션 지원
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal.active');
                modals.forEach(modal => modal.classList.remove('active'));
            }
        });

        // 포커스 표시 개선
        document.addEventListener('focusin', (e) => {
            e.target.classList.add('focus-visible');
        });
        
        document.addEventListener('focusout', (e) => {
            e.target.classList.remove('focus-visible');
        });
    }

    // 🚀 메인 초기화 함수
    async function initNofeeMain() {
        try {
            // 초기 데이터 로드
            await loadInitialData();
            
            // 배너 초기화
            await initBanner();
            
            // 비동기 데이터 로드
            await Promise.all([
                loadBestProducts(),
                loadReviews()
            ]);
            
            // 나머지 초기화
            initAnimations();
            initAICTA();
            initLoadMoreButton();
            optimizePerformance();
            improveAccessibility();
            
            // 전역 함수로 브랜드 선택 함수 등록
            window.selectBrand = selectBrand;
            
            console.log('노피 메인페이지 초기화 완료');
            
        } catch (error) {
            handleError(error, 'Main initialization');
        }
    }

    // DOM 준비 확인 및 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNofeeMain);
    } else {
        // DOM이 이미 로드된 경우
        initNofeeMain();
    }

    // 전역 에러 핸들러
    window.addEventListener('error', (e) => {
        handleError(e.error, 'Global');
    });

    // Promise 에러 핸들러
    window.addEventListener('unhandledrejection', (e) => {
        handleError(e.reason, 'Promise');
        e.preventDefault(); // 콘솔 에러 방지
    });

    // 페이지 언로드 시 정리
    window.addEventListener('beforeunload', () => {
        if (bannerInterval) {
            clearInterval(bannerInterval);
        }
    });

})();
