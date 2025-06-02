// 🔍 노피 더보기(상품검색) 페이지 스크립트 - GitHub 관리용
(function() {
    'use strict';

    // 🐛 임시 디버깅 코드 - 배포 전 제거
    (function debugUrls() {
        console.log('🔍 현재 페이지 정보:');
        console.log('  - Origin:', window.location.origin);
        console.log('  - Pathname:', window.location.pathname);
        console.log('  - Host:', window.location.host);
    })();
    
    // 🎯 전역 상태 관리
    const state = {
        products: [],
        filteredProducts: [],
        currentPage: 1,
        pageSize: 12,
        isLoading: false,
        filters: {
            carrier: '',
            brand: '',
            type: '',
            support: '',
            sort: ''
        },
        elements: {},
        searchTimer: null
    };
    
    // ⚡ URL 설정 - 한 곳에서만 정의
    // 옵션 1: 현재 웹사이트 기준 (권장 - CORS 문제 없음)
    const PRODUCTS_DATA_URL = '/data/products.json';
    const MODELS_DATA_URL = '/data/models.json';
    
    // 옵션 2: GitHub Raw URLs (백업용)
    const BACKUP_PRODUCTS_URL = 'https://raw.githubusercontent.com/jacob-po/nofee-webflow/main/data/products.json';
    const BACKUP_MODELS_URL = 'https://raw.githubusercontent.com/jacob-po/nofee-webflow/main/data/models.json';
    
    // 옵션 3: 다른 가능한 GitHub Raw URLs
    const ALTERNATIVE_PRODUCTS_URL = 'https://raw.githubusercontent.com/jacob-po/products-data/main/products.json';
    const ALTERNATIVE_MODELS_URL = 'https://raw.githubusercontent.com/jacob-po/products-data/main/models.json';

    let modelsData = {};

    // URL 접근성 테스트 함수
    const testAllUrls = async () => {
        const urlsToTest = [
            { name: 'Primary Products', url: PRODUCTS_DATA_URL },
            { name: 'Primary Models', url: MODELS_DATA_URL },
            { name: 'Backup Products', url: BACKUP_PRODUCTS_URL },
            { name: 'Backup Models', url: BACKUP_MODELS_URL },
            { name: 'Alternative Products', url: ALTERNATIVE_PRODUCTS_URL },
            { name: 'Alternative Models', url: ALTERNATIVE_MODELS_URL }
        ];

        console.log('🧪 모든 URL 접근성 테스트:');
        
        for (const item of urlsToTest) {
            try {
                const response = await fetch(item.url, { method: 'HEAD' });
                console.log(`✅ ${item.name}: ${response.status} ${response.statusText}`);
            } catch (error) {
                console.log(`❌ ${item.name}: ${error.message}`);
            }
        }
    };

    // 즉시 URL 테스트 실행
    testAllUrls();
    
    // 설정값
    const CONFIG = {
        ANIMATION_DELAY: 20,
        ANIMATION_DURATION: 50,
        DEBOUNCE_DELAY: 200,
        VIEW_HISTORY_LIMIT: 20,
        CARD_FADE_DELAY: 0.05
    };

    // 🎨 유틸리티 함수들
    const utils = {
        formatKRW: (value) => {
            return Math.abs(Number(value)).toLocaleString("ko-KR") + "원";
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
        
        getBrandInfo: (brand) => {
            const brandMap = {
                '삼성': { icon: 'S', class: 'samsung', displayName: '삼성' },
                '애플': { icon: 'A', class: 'apple', displayName: '애플' },
                'Samsung': { icon: 'S', class: 'samsung', displayName: '삼성' },
                'Apple': { icon: 'A', class: 'apple', displayName: '애플' }
            };
            return brandMap[brand] || { icon: '📱', class: 'etc', displayName: brand };
        },

        getOriginPrice: (model) => {
            if (modelsData && modelsData[model]) {
                return modelsData[model].originPrice;
            }

            if (modelsData) {
                for (const [key, value] of Object.entries(modelsData)) {
                    if (model.includes(key) || key.includes(model)) {
                        return value.originPrice;
                    }
                }
            }

            const modelLower = model.toLowerCase();
            
            // 기본 가격 매핑
            if (modelLower.includes('galaxy s25 ultra') || model.includes('갤럭시 S25 울트라')) return 1700000;
            if (modelLower.includes('galaxy s25+') || modelLower.includes('galaxy s25 plus') || model.includes('갤럭시 S25 플러스')) return 1400000;
            if (modelLower.includes('galaxy s25') || model.includes('갤럭시 S25')) return 1200000;
            if (modelLower.includes('galaxy s24 ultra') || model.includes('갤럭시 S24 울트라')) return 1600000;
            if (modelLower.includes('galaxy s24+') || modelLower.includes('galaxy s24 plus') || model.includes('갤럭시 S24 플러스')) return 1300000;
            if (modelLower.includes('galaxy s24 fe') || model.includes('갤럭시 S24 FE')) return 900000;
            if (modelLower.includes('galaxy s24') || model.includes('갤럭시 S24')) return 1100000;
            if (modelLower.includes('galaxy z fold') || model.includes('갤럭시 Z 폴드')) return 2200000;
            if (modelLower.includes('galaxy z flip') || model.includes('갤럭시 Z 플립')) return 1400000;
            if (modelLower.includes('iphone 16 pro max') || model.includes('아이폰 16 프로 맥스')) return 1900000;
            if (modelLower.includes('iphone 16 pro') || model.includes('아이폰 16 프로')) return 1550000;
            if (modelLower.includes('iphone 16 plus') || model.includes('아이폰 16 플러스')) return 1350000;
            if (modelLower.includes('iphone 16') || model.includes('아이폰 16')) return 1250000;
            if (modelLower.includes('iphone 15') || model.includes('아이폰 15')) return 1150000;

            return 1000000;
        },

        calculateDiscount: (originalPrice, principal) => {
            const origin = Number(originalPrice) || 0;
            const principalAmount = Number(principal) || 0;
            
            if (origin === 0) return { discount: 0, discountRate: 0 };
            
            const discount = Math.abs(principalAmount);
            const discountRate = Math.round((discount / origin) * 100);
            
            return { discount, discountRate };
        },
        
        normalizeProduct: (product) => {
            return {
                ...product,
                brand: utils.normalizeBrand(product.brand),
                originPrice: product['origin price'] || product.originPrice || utils.getOriginPrice(product.model),
                principal: Number(product.principal) || 0,
                total: Number(product.total) || 0,
                installment: Number(product.installment) || 0,
                plan: Number(product.plan) || 0
            };
        },
        
        normalizeBrand: (brand) => {
            if (!brand) return '';
            const brandLower = brand.toLowerCase();
            if (brandLower === 'samsung') return '삼성';
            if (brandLower === 'apple') return '애플';
            return brand;
        },
        
        getFilterLabel: (category, value) => {
            const labels = {
                carrier: { 'KT': 'KT', 'LGU': 'LG유플러스', 'SKT': 'SK텔레콤' },
                brand: { '삼성': '삼성', '애플': '애플' },
                type: { '번호이동': '번호이동', '기기변경': '기기변경', '신규가입': '신규가입' },
                support: { '공시지원': '공시지원', '선택약정': '선택약정', 'O': '지원금O', 'X': '지원금X' },
                sort: { 'asc': '월납부금 낮은순', 'desc': '월납부금 높은순', 'discount': '할인율 높은순' }
            };
            
            return labels[category]?.[value] || value;
        }
    };

    // 📊 데이터 관리 - 완전히 새로운 로딩 로직
    const dataManager = {
        loadProducts: async () => {
            try {
                state.isLoading = true;
                ui.renderLoading();

                console.log('🔍 데이터 로딩 시작...');

                // 순차적으로 URL 시도
                const urlSets = [
                    { 
                        name: 'Primary (Same Domain)', 
                        products: PRODUCTS_DATA_URL, 
                        models: MODELS_DATA_URL 
                    },
                    { 
                        name: 'Backup (GitHub nofee-webflow)', 
                        products: BACKUP_PRODUCTS_URL, 
                        models: BACKUP_MODELS_URL 
                    },
                    { 
                        name: 'Alternative (GitHub products-data)', 
                        products: ALTERNATIVE_PRODUCTS_URL, 
                        models: ALTERNATIVE_MODELS_URL 
                    }
                ];

                let productData = null;
                let modelData = {};
                let successfulSet = null;

                // 각 URL 세트를 순서대로 시도
                for (const urlSet of urlSets) {
                    console.log(`⏳ ${urlSet.name} 시도 중...`);
                    
                    try {
                        // Products 데이터 로드
                        console.log(`📡 Products URL: ${urlSet.products}`);
                        const productsResponse = await fetch(urlSet.products);
                        console.log(`📊 Products 응답: ${productsResponse.status} ${productsResponse.statusText}`);
                        
                        if (!productsResponse.ok) {
                            throw new Error(`Products failed: ${productsResponse.status}`);
                        }
                        
                        const tempProductData = await productsResponse.json();
                        console.log(`✅ Products 로드 성공: ${tempProductData.length}개`);
                        
                        // Models 데이터 로드 (선택사항)
                        let tempModelData = {};
                        try {
                            console.log(`📡 Models URL: ${urlSet.models}`);
                            const modelsResponse = await fetch(urlSet.models);
                            console.log(`📊 Models 응답: ${modelsResponse.status} ${modelsResponse.statusText}`);
                            
                            if (modelsResponse.ok) {
                                tempModelData = await modelsResponse.json();
                                console.log(`✅ Models 로드 성공: ${Object.keys(tempModelData).length}개`);
                            }
                        } catch (modelsError) {
                            console.warn('⚠️ Models 로드 실패 (계속 진행):', modelsError.message);
                        }
                        
                        // 성공한 경우 데이터 저장하고 루프 종료
                        productData = tempProductData;
                        modelData = tempModelData;
                        successfulSet = urlSet.name;
                        break;
                        
                    } catch (error) {
                        console.warn(`❌ ${urlSet.name} 실패:`, error.message);
                        continue;
                    }
                }

                // 모든 URL 세트가 실패한 경우
                if (!productData) {
                    throw new Error('모든 데이터 소스에서 로드 실패');
                }

                // 데이터 할당
                state.products = productData;
                modelsData = modelData || {};

                console.log('🎉 데이터 로드 성공!');
                console.log(`📈 최종 결과 (${successfulSet}):`);
                console.log(`  - Products: ${state.products.length}개`);
                console.log(`  - Models: ${Object.keys(modelsData).length}개`);

                // 렌더링
                urlManager.loadFiltersFromURL();
                ui.renderProducts();

                return true;

            } catch (error) {
                console.error('💥 데이터 로드 완전 실패:', error);
                console.error('상세 에러 정보:', {
                    message: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    currentUrl: window.location.href
                });
                
                ui.renderError(`데이터 로드 실패: ${error.message}`);
                return false;
                
            } finally {
                state.isLoading = false;
                console.log('🏁 데이터 로딩 프로세스 완료');
            }
        },
        
        addToViewHistory: (product) => {
            try {
                const viewed = {
                    id: `${product.model}_${product.carrier}_${product.type}_${product.support}`,
                    model: product.model,
                    carrier: product.carrier,
                    type: product.type,
                    support: product.support,
                    brand: product.brand,
                    total: product.total,
                    time: Date.now()
                };
                
                let history = JSON.parse(localStorage.getItem('viewedProducts') || '[]');
                history = history.filter(item => item.id !== viewed.id);
                history.unshift(viewed);
                
                if (history.length > CONFIG.VIEW_HISTORY_LIMIT) {
                    history = history.slice(0, CONFIG.VIEW_HISTORY_LIMIT);
                }
                
                localStorage.setItem('viewedProducts', JSON.stringify(history));
                
            } catch (error) {
                console.error('최근 본 상품 저장 실패:', error);
            }
        }
    };

    // 나머지 UI, 필터 관리, 이벤트 핸들러 코드는 동일...
    // (중략 - 기존 코드 유지)

})();
