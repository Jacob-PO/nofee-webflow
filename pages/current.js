// 📱 노피 최근 본 상품 페이지 스크립트 - 심플 버전
(function() {
    'use strict';
    
    console.log('노피 최근 본 상품 페이지 초기화 시작...');
    
    // 🎯 전역 상태 관리
    const state = {
        viewedHistory: [],
        allProducts: [],
        matchedProducts: [],
        isLoading: false
    };
    
    // GitHub 저장소 설정
    const basePath = window.location.pathname.startsWith('/nofee-webflow') ? '/nofee-webflow' : '';
    const GITHUB_BASE_URL = window.location.origin + basePath;
    const PRODUCTS_DATA_URL = `${GITHUB_BASE_URL}/data/products.json`;
    
    // DOM 요소 캐싱
    let elements = {};
    
    // 🎨 유틸리티 함수들
    const utils = {
        // 금액 포맷팅
        formatKRW: (value) => {
            return Number(value).toLocaleString("ko-KR");
        },
        
        // 시간 포맷팅
        formatTime: (timestamp) => {
            const d = new Date(timestamp);
            const now = new Date();
            const diff = now - d;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            
            if (minutes < 1) return '방금 전';
            if (minutes < 60) return `${minutes}분 전`;
            if (hours < 24) return `${hours}시간 전`;
            if (days < 7) return `${days}일 전`;
            
            // 7일 이상은 날짜 표시
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}.${mm}.${dd}`;
        },
        
        // 로컬스토리지 안전하게 읽기
        getLocalStorage: (key, defaultValue = []) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('로컬스토리지 읽기 오류:', error);
                return defaultValue;
            }
        },
        
        // 로컬스토리지 안전하게 쓰기
        setLocalStorage: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('로컬스토리지 쓰기 오류:', error);
                return false;
            }
        },

        transformProduct: (item) => {
            const modelMap = {
                'S25-256': '갤럭시 S25 256GB',
                'S25플러스-256': '갤럭시 S25+ 256GB',
                'S25울트라-256': '갤럭시 S25 Ultra 256GB',
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
            const carrierMap = { SK: 'SKT', KT: 'KT', LG: 'LGU+' };
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
        }
    };
    
    // 🏢 브랜드 정보 가져오기
    const getBrandInfo = (brand) => {
        // 영문 브랜드명 처리
        let normalizedBrand = brand;
        if (brand && brand.toLowerCase() === 'samsung') {
            normalizedBrand = '삼성';
        } else if (brand && brand.toLowerCase() === 'apple') {
            normalizedBrand = '애플';
        }
        
        switch(normalizedBrand) {
            case '삼성':
                return { 
                    icon: 'S', 
                    class: 'samsung',
                    color: '#1f4788',
                    displayName: '삼성'
                };
            case '애플':
                return { 
                    icon: 'A', 
                    class: 'apple',
                    color: '#333',
                    displayName: '애플'
                };
            default:
                return { 
                    icon: '📱', 
                    class: 'etc',
                    color: '#666',
                    displayName: brand || '기타'
                };
        }
    };
    
    // 📊 데이터 관리
    const dataManager = {
        // 최근 본 상품 기록 로드
        loadViewedHistory: () => {
            state.viewedHistory = utils.getLocalStorage('viewedProducts', []);
            console.log(`최근 본 상품 ${state.viewedHistory.length}개 로드`);
            return state.viewedHistory;
        },
        
        // 상품 데이터와 매칭
        matchProducts: () => {
            if (!state.viewedHistory.length || !state.allProducts.length) {
                state.matchedProducts = [];
                return;
            }
            
            state.matchedProducts = state.viewedHistory
                .map(viewed => {
                    // 매칭되는 상품 찾기
                    const matched = state.allProducts.find(product => 
                        product.model === viewed.model &&
                        product.carrier === viewed.carrier &&
                        product.type === viewed.type &&
                        product.support === viewed.support
                    );
                    
                    if (matched) {
                        return {
                            ...matched,
                            viewedTime: viewed.time,
                            viewedId: viewed.id || `${viewed.model}_${viewed.carrier}_${viewed.type}_${viewed.support}`
                        };
                    }
                    return null;
                })
                .filter(Boolean) // null 제거
                .sort((a, b) => b.viewedTime - a.viewedTime); // 최신순 정렬
            
            console.log(`매칭된 상품 ${state.matchedProducts.length}개`);
        },
        
        // 상품 제거
        removeProduct: (viewedId) => {
            // 기록에서 제거
            state.viewedHistory = state.viewedHistory.filter(item => {
                const itemId = item.id || `${item.model}_${item.carrier}_${item.type}_${item.support}`;
                return itemId !== viewedId;
            });
            
            // 로컬스토리지 업데이트
            utils.setLocalStorage('viewedProducts', state.viewedHistory);
            
            // 매칭된 상품 목록 업데이트
            state.matchedProducts = state.matchedProducts.filter(item => item.viewedId !== viewedId);
            
            // UI 업데이트
            ui.renderProducts();
            ui.updateStats();
        },
        
        // 전체 삭제
        clearAll: () => {
            if (confirm('최근 본 상품 기록을 모두 삭제하시겠습니까?')) {
                state.viewedHistory = [];
                state.matchedProducts = [];
                utils.setLocalStorage('viewedProducts', []);
                ui.renderProducts();
                ui.updateStats();
            }
        }
    };
    
    // 🎨 UI 렌더링
    const ui = {
        // 상품 카드 생성
        createProductCard: (product) => {
            const brandInfo = getBrandInfo(product.brand);
            const timeAgo = utils.formatTime(product.viewedTime);
            
            const card = document.createElement('div');
            card.className = 'viewed-card';
            card.dataset.viewedId = product.viewedId;
            
            card.innerHTML = `
                <button class="remove-btn" title="삭제">×</button>
                <div class="card-content">
                    <div class="brand-badge ${brandInfo.class}">
                        <span>${brandInfo.icon}</span>
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${product.model}</h3>
                        <div class="product-meta">
                            <span class="meta-item">${product.carrier}</span>
                            <span class="meta-separator">·</span>
                            <span class="meta-item">${product.type}</span>
                            <span class="meta-separator">·</span>
                            <span class="meta-item">${product.support}</span>
                        </div>
                        <div class="product-price">
                            <span class="price-label">월</span>
                            <span class="price-value">₩${utils.formatKRW(product.total)}</span>
                        </div>
                        <div class="viewed-time">${timeAgo}</div>
                    </div>
                </div>
            `;
            
            // 카드 클릭 이벤트
            card.querySelector('.card-content').addEventListener('click', () => {
                ui.handleProductClick(product);
            });
            
            // 삭제 버튼 이벤트
            card.querySelector('.remove-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                ui.handleRemoveClick(product.viewedId);
            });
            
            return card;
        },
        
        // 상품 렌더링
        renderProducts: () => {
            if (!elements.productList) return;
            
            // 리스트 초기화
            elements.productList.innerHTML = '';
            
            if (state.matchedProducts.length === 0) {
                ui.renderEmptyState();
                return;
            }
            
            // 상품 카드 추가
            state.matchedProducts.forEach((product, index) => {
                const card = ui.createProductCard(product);
                card.style.animationDelay = `${index * 0.05}s`;
                elements.productList.appendChild(card);
            });
        },
        
        // 빈 상태 렌더링
        renderEmptyState: () => {
            const emptyHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>최근 본 상품이 없습니다</h3>
                    <p>상품을 둘러보고 오세요!</p>
                    <a href="/" class="empty-button">상품 보러가기</a>
                </div>
            `;
            
            elements.productList.innerHTML = emptyHTML;
        },
        
        // 통계 업데이트
        updateStats: () => {
            if (elements.totalCount) {
                elements.totalCount.textContent = state.matchedProducts.length;
            }
        },
        
        // 상품 클릭 처리
        handleProductClick: (product) => {
            // 파라미터 생성
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
            
            // AI 상담 페이지로 이동
            window.location.href = `/ai?${params.toString()}`;
        },
        
        // 삭제 클릭 처리
        handleRemoveClick: (viewedId) => {
            const card = document.querySelector(`[data-viewed-id="${viewedId}"]`);
            if (card) {
                card.style.transition = 'all 0.3s ease';
                card.style.transform = 'scale(0.9)';
                card.style.opacity = '0';
                setTimeout(() => {
                    dataManager.removeProduct(viewedId);
                }, 300);
            }
        },
        
        // 로딩 상태 표시
        showLoading: () => {
            if (elements.productList) {
                elements.productList.innerHTML = `
                    <div class="loading-state">
                        <div class="spinner"></div>
                        <p>상품 정보를 불러오는 중...</p>
                    </div>
                `;
            }
        },
        
        // 에러 상태 표시
        showError: (message) => {
            if (elements.productList) {
                elements.productList.innerHTML = `
                    <div class="error-state">
                        <div class="error-icon">⚠️</div>
                        <h3>오류가 발생했습니다</h3>
                        <p>${message}</p>
                        <button onclick="location.reload()" class="retry-button">다시 시도</button>
                    </div>
                `;
            }
        }
    };
    
    // 🎮 이벤트 핸들러
    const eventHandlers = {
        // 전체 삭제
        handleClearAll: () => {
            dataManager.clearAll();
        },
        
        // 새로고침
        handleRefresh: async () => {
            await init();
        }
    };
    
    // 🚀 초기화
    async function init() {
        try {
            state.isLoading = true;
            
            // DOM 요소 캐싱
            elements = {
                productList: document.getElementById('productList'),
                totalCount: document.getElementById('totalCount'),
                clearAllBtn: document.getElementById('clearAllBtn'),
                refreshBtn: document.getElementById('refreshBtn')
            };
            
            // 로딩 표시
            ui.showLoading();
            
            // 최근 본 상품 기록 로드
            dataManager.loadViewedHistory();
            
            if (state.viewedHistory.length === 0) {
                ui.renderEmptyState();
                return;
            }
            
            // 상품 데이터 로드
            console.log('상품 데이터 로드 시작...');
            const response = await fetch(PRODUCTS_DATA_URL);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const rawProducts = await response.json();
            state.allProducts = utils.transformProducts(rawProducts);
            console.log(`전체 상품 데이터 로드 완료: ${state.allProducts.length}개`);
            
            // 상품 매칭
            dataManager.matchProducts();
            
            // UI 렌더링
            ui.renderProducts();
            ui.updateStats();
            
            // 이벤트 리스너 설정
            setupEventListeners();
            
            console.log('노피 최근 본 상품 페이지 초기화 완료');
            
        } catch (error) {
            console.error('초기화 중 오류 발생:', error);
            ui.showError('상품 정보를 불러올 수 없습니다.');
        } finally {
            state.isLoading = false;
        }
    }
    
    // 🎯 이벤트 리스너 설정
    function setupEventListeners() {
        // 전체 삭제 버튼
        if (elements.clearAllBtn) {
            elements.clearAllBtn.addEventListener('click', eventHandlers.handleClearAll);
        }
        
        // 새로고침 버튼
        if (elements.refreshBtn) {
            elements.refreshBtn.addEventListener('click', eventHandlers.handleRefresh);
        }
        
        // 페이지 가시성 변경 감지
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // 페이지가 다시 보이면 데이터 새로고침
                dataManager.loadViewedHistory();
                dataManager.matchProducts();
                ui.renderProducts();
                ui.updateStats();
            }
        });
    }
    
    // DOM 준비 확인
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM이 이미 로드된 경우
        init();
    }
    
    // 전역 에러 핸들러
    window.addEventListener('error', (e) => {
        console.error('전역 에러:', e.error);
    });
    
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Promise 에러:', e.reason);
    });
    
})();
