// 🚀 노피 메인페이지 스크립트 - GitHub 관리용
(function() {
    'use strict';
    
    // 🎯 전역 상태 관리
    let allProducts = [];
    let currentBannerIndex = 0;
    let bannerInterval;

    // GitHub 저장소 설정
    const GITHUB_BASE_URL = 'https://jacob-po.github.io/nofee-webflow';
    const PRODUCTS_DATA_URL = 'https://raw.githubusercontent.com/jacob-po/products-data/refs/heads/main/products.json';

    // 🎨 유틸리티 함수들
    const formatKRW = (value) => {
        return Math.abs(Number(value)).toLocaleString("ko-KR") + "원";
    };

    const getBrandInfo = (brand) => {
        switch(brand) {
            case '삼성': return { icon: 'S', class: 'samsung' };
            case '애플': return { icon: 'A', class: 'apple' };
            default: return { icon: '📱', class: 'etc' };
        }
    };

    const calculateDiscount = (originalPrice, principal) => {
        const discount = Math.abs(principal);
        const discountRate = Math.round((discount / originalPrice) * 100);
        return { discount, discountRate };
    };

    // 🚀 배너 슬라이더
    function initBanner() {
        const track = document.getElementById('bannerTrack');
        const indicators = document.querySelectorAll('.indicator');
        const slideCount = 3;

        if (!track || !indicators.length) return;

        function goToSlide(index) {
            currentBannerIndex = index;
            track.style.transform = `translateX(-${currentBannerIndex * 100}%)`;
            
            indicators.forEach((indicator, i) => {
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
        indicators.forEach((indicator, index) => {
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
    }

    // 🏆 상품 카드 생성
    function createProductCard(product) {
        const brandInfo = getBrandInfo(product.brand);
        const { discount, discountRate } = calculateDiscount(product['origin price'], product.principal);
        
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
                        <span class="meta-tag">${product.support}</span>
                    </div>
                </div>
            </div>
            
            <div class="price-section">
                <div class="original-price">
                    <span class="price-original">${formatKRW(product['origin price'])}</span>
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
                brand: product.brand || "",
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
            
            // 상품 필터링 및 정렬 (출고가 0원이거나 공란인 상품 제외)
            const filteredProducts = data
                .filter(product => {
                    const originPrice = product['origin price'];
                    if (!originPrice || originPrice === 0 || originPrice === '') return false;
                    if (!['삼성', '애플'].includes(product.brand)) return false;
                    if (product.total < 30000) return false;
                    return true;
                })
                .map(product => {
                    const { discountRate } = calculateDiscount(product['origin price'], product.principal);
                    return { ...product, discountRate };
                })
                .sort((a, b) => b.discountRate - a.discountRate);
            
            // 삼성과 애플 각각 할인율 높은 상품 2개씩
            const samsungProducts = filteredProducts
                .filter(p => p.brand === '삼성')
                .slice(0, 2);
                
            const appleProducts = filteredProducts
                .filter(p => p.brand === '애플')
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
    function loadReviews() {
        const reviewsScroll = document.getElementById('reviewsScroll');
        
        if (!reviewsScroll) return;
        
        const reviews = [
            {
                name: "김민수", initial: "김", product: "갤럭시 S25 Ultra 256GB",
                comment: "기기변경으로 샀는데 <span class='review-highlight'>월 8만원대</span>면 진짜 혜자예요. 개통도 빠르고 설명도 잘 해주셔서 좋았어요.",
                rating: 5.0, date: "2025. 05. 29."
            },
            {
                name: "이지영", initial: "이", product: "아이폰 16 Pro 128GB",
                comment: "원래 비쌀 줄 알았는데 <span class='review-highlight'>월 9만원도 안 돼서</span> 바로 구매했습니다. 상담도 친절했어요!",
                rating: 4.9, date: "2025. 05. 29."
            },
            {
                name: "박준호", initial: "박", product: "갤럭시 Z플립 6 256GB",
                comment: "플립 사고 싶었는데 가격이 부담됐거든요. 여기선 <span class='review-highlight'>월 7만원 후반</span>이라 바로 질렀어요.",
                rating: 4.8, date: "2025. 05. 28."
            },
            {
                name: "정수연", initial: "정", product: "아이폰 16 Pro Max 256GB",
                comment: "배송 빠르고 무엇보다 <span class='review-highlight'>사후 안내가 확실</span>했어요. 다음에 부모님 것도 여기서 바꿔드릴게요.",
                rating: 5.0, date: "2025. 05. 28."
            },
            {
                name: "유현우", initial: "유", product: "갤럭시 S24 FE",
                comment: "<span class='review-highlight'>할인율이 40% 넘어서</span> 놀랐어요. 중학생 아이한테 사줬는데 성능도 충분하네요.",
                rating: 4.7, date: "2025. 05. 27."
            },
            {
                name: "최서윤", initial: "최", product: "아이폰 16 128GB",
                comment: "노피AI로 상담받고 구매했는데 <span class='review-highlight'>정말 편리</span>했어요. 추천해요!",
                rating: 4.9, date: "2025. 05. 27."
            }
        ];
        
        reviewsScroll.innerHTML = '';
        
        reviews.forEach(review => {
            const stars = '⭐'.repeat(Math.floor(review.rating));
            
            const reviewCard = document.createElement('div');
            reviewCard.className = 'review-card';
            
            reviewCard.innerHTML = `
                <div class="review-header">
                    <div class="reviewer-avatar">${review.initial}</div>
                    <div class="reviewer-info">
                        <h5>${review.name}</h5>
                        <div class="review-rating">${stars} ${review.rating}</div>
                    </div>
                </div>
                <div class="review-product">${review.product}</div>
                <div class="review-text">${review.comment}</div>
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
    function initNofeeMain() {
        try {
            // 모든 초기화 함수 실행
            initBanner();
            loadBestProducts();
            loadReviews();
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