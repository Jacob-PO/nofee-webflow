// 🤖 노피 AI 상담 페이지 스크립트 - GitHub 관리용
(function() {
    'use strict';
    
    // 🎯 전역 상태 관리
    const state = {
        // 챗봇 상태
        chatContainer: null,
        states: ['askPrice', 'askBrand', 'askProduct', 'askName', 'askPhone', 'askRegion', 'askCity', 'complete', 'askConsent'],
        stateIndex: 0,
        consentGiven: false,
        hasPreSelectedProduct: false,
        
        // 사용자 데이터
        userData: {
            name: '',
            phone: '',
            region: '',
            city: '',
            consent: ''
        },
        
        // 상품 데이터
        selectedProduct: {},
        filteredProducts: [],
        selectedPriceRange: {},
        selectedBrand: '',
        products: [],
        regionToCity: {}
    };
    
    // GitHub 저장소 설정
    const GITHUB_BASE_URL = 'https://jacob-po.github.io/nofee-webflow';
    // products.json이 같은 저장소에 있는 경우:
    const PRODUCTS_DATA_URL = `${GITHUB_BASE_URL}/data/products.json`;
    const REGIONS_DATA_URL = `${GITHUB_BASE_URL}/data/regions.json`;
    // 외부 저장소를 사용하려면 아래 주석을 해제하고 위 줄을 주석 처리:
    // const PRODUCTS_DATA_URL = 'https://jacob-po.github.io/products-data/products.json';
    // const REGIONS_DATA_URL = 'https://raw.githubusercontent.com/Jacob-PO/products-data/main/regions.json';
    
    // 🎨 유틸리티 함수들
    const utils = {
        formatPrice: (value) => {
            return Number(value).toLocaleString("ko-KR");
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
        
        sanitizeInput: (input) => {
            return input.trim().replace(/<[^>]*>?/gm, '');
        },
        
        validatePhone: (phone) => {
            const phoneRegex = /^01[0-9]{8,9}$/;
            return phoneRegex.test(phone.replace(/-/g, ''));
        }
    };
    
    // 🤖 AI 애니메이션 함수들
    const animations = {
        showGreeting: () => {
            chatUI.addBotMessage("안녕하세요 고객님! 저는 AI 상담원입니다.", 5);
        },
        
        showAIThinking: async (text = "AI가 맞춤 상품을 분석 중입니다") => {
            const thinking = document.createElement('div');
            thinking.className = 'ai-thinking';
            thinking.innerHTML = `
                <div class="ai-dots">
                    <div class="ai-dot"></div>
                    <div class="ai-dot"></div>
                    <div class="ai-dot"></div>
                </div>
                <div class="ai-thinking-text">${text}...</div>
            `;
            state.chatContainer.appendChild(thinking);
            state.chatContainer.scrollTop = state.chatContainer.scrollHeight;
            
            return new Promise(resolve => {
                setTimeout(() => {
                    thinking.remove();
                    resolve();
                }, 800);
            });
        },
        
        showLoader: (callback) => {
            setTimeout(callback, 100);
        }
    };
    
    // 💬 채팅 UI 함수들
    const chatUI = {
        addBotMessage: (msg, delay = 5) => {
            const div = document.createElement('div');
            div.className = 'chat-bubble bot';
            state.chatContainer.appendChild(div);
            
            let i = 0;
            function typeChar() {
                if (i <= msg.length) {
                    div.innerText = msg.slice(0, i++);
                    setTimeout(typeChar, delay);
                } else {
                    state.chatContainer.scrollTop = state.chatContainer.scrollHeight;
                }
            }
            typeChar();
        },
        
        addUserMessage: (msg) => {
            const div = document.createElement('div');
            div.className = 'chat-bubble user';
            div.innerText = msg;
            state.chatContainer.appendChild(div);
            state.chatContainer.scrollTop = state.chatContainer.scrollHeight;
        },
        
        createBackButton: () => {
            const back = document.createElement('button');
            back.className = 'chat-back';
            back.textContent = '← 이전으로 돌아가기';
            back.onclick = () => {
                if (state.stateIndex > 0) {
                    state.stateIndex--;
                    const inputEls = state.chatContainer.querySelectorAll('.chat-input, .chat-bubble.user');
                    if (inputEls.length) {
                        inputEls[inputEls.length - 1].remove();
                    }
                    chatFlow.nextStep();
                }
            };
            return back;
        },
        
        showButtons: (labels, callback, showBack = true) => {
            animations.showLoader(() => {
                const wrapper = document.createElement('div');
                wrapper.className = 'chat-input';
                
                labels.forEach(label => {
                    const btn = document.createElement('button');
                    btn.innerText = label;
                    btn.onclick = () => {
                        wrapper.remove();
                        chatUI.addUserMessage(label);
                        callback(label);
                    };
                    wrapper.appendChild(btn);
                });
                
                if (showBack && !state.hasPreSelectedProduct) {
                    wrapper.appendChild(chatUI.createBackButton());
                }
                
                state.chatContainer.appendChild(wrapper);
                state.chatContainer.scrollTop = state.chatContainer.scrollHeight;
            });
        },
        
        showInput: (type, options = [], showBack = true) => {
            animations.showLoader(() => {
                const wrapper = document.createElement('div');
                wrapper.className = 'chat-input';
                
                if (type === 'select') {
                    const select = document.createElement('select');
                    select.innerHTML = '<option value="">선택해주세요</option>' + 
                        options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
                    
                    select.onchange = () => {
                        if (select.value) {
                            wrapper.remove();
                            chatFlow.proceed(select.value);
                        }
                    };
                    wrapper.appendChild(select);
                } else {
                    const input = document.createElement('input');
                    input.placeholder = type === 'phone' ? '01012345678' : '입력해주세요';
                    if (type === 'phone') {
                        input.type = 'tel';
                        input.maxLength = 11;
                    }
                    
                    wrapper.appendChild(input);
                    
                    const btn = document.createElement('button');
                    btn.textContent = '입력';
                    btn.onclick = () => {
                        const value = utils.sanitizeInput(input.value);
                        
                        if (type === 'phone' && !utils.validatePhone(value)) {
                            input.style.borderColor = '#ff4444';
                            input.placeholder = '올바른 전화번호를 입력해주세요';
                            return;
                        }
                        
                        if (value) {
                            wrapper.remove();
                            chatFlow.proceed(value);
                        }
                    };
                    wrapper.appendChild(btn);
                    
                    // Enter 키 지원
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            btn.click();
                        }
                    });
                }
                
                if (showBack && !state.hasPreSelectedProduct) {
                    wrapper.appendChild(chatUI.createBackButton());
                }
                
                state.chatContainer.appendChild(wrapper);
                state.chatContainer.scrollTop = state.chatContainer.scrollHeight;
                
                // 자동 포커스
                const focusEl = wrapper.querySelector('input, select');
                if (focusEl) {
                    setTimeout(() => focusEl.focus(), 100);
                }
            });
        }
    };
    
    // 🔄 채팅 플로우 관리
    const chatFlow = {
        askPrice: async () => {
            await animations.showAIThinking("요금대 분석 중");
            chatUI.addBotMessage("노피에서 월 요금대를 기준으로 상품을 추천드릴게요.\n선호하시는 요금대를 선택해주세요.");
            
            const ranges = [
                { label: '3~5만 원', min: 30000, max: 50000 },
                { label: '5~7만 원', min: 50000, max: 70000 },
                { label: '7~9만 원', min: 70000, max: 90000 },
                { label: '9~10만 원', min: 90000, max: 100000 },
                { label: '10만 원 이상', min: 100000, max: Infinity }
            ];
            
            chatUI.showButtons(ranges.map(r => r.label), (label) => {
                const range = ranges.find(r => r.label === label);
                state.selectedPriceRange = range;
                state.filteredProducts = state.products.filter(p => 
                    +p.total >= range.min && +p.total < range.max
                );
                
                dataManager.updateUrlParams();
                state.stateIndex++;
                chatFlow.nextStep();
            }, false);
        },
        
        askBrand: async () => {
            await animations.showAIThinking("브랜드 매칭 중");
            
            if (state.filteredProducts.length === 0) {
                chatUI.addBotMessage("선택하신 가격대에 맞는 상품이 없습니다.\n다른 가격대를 선택해주세요.");
                state.stateIndex = 0;
                chatFlow.nextStep();
                return;
            }
            
            chatUI.addBotMessage("어느 브랜드를 원하시나요?\n고객님의 선택을 기다리고 있어요.");
            const brands = [...new Set(state.filteredProducts.map(p => p.brand))];
            
            chatUI.showButtons(brands, (brand) => {
                state.selectedBrand = brand;
                state.filteredProducts = state.filteredProducts.filter(p => p.brand === brand);
                dataManager.updateUrlParams();
                state.stateIndex++;
                chatFlow.nextStep();
            });
        },
        
        askProduct: async () => {
            await animations.showAIThinking("최적 상품 추천 중");
            
            if (state.filteredProducts.length === 0) {
                chatUI.addBotMessage("조건에 맞는 상품이 없습니다.\n처음부터 다시 선택해주세요.");
                state.stateIndex = 0;
                state.filteredProducts = [];
                chatFlow.nextStep();
                return;
            }
            
            chatUI.addBotMessage("추천드릴 수 있는 상품 목록이에요.\n원하시는 모델을 골라주세요.");
            
            animations.showLoader(() => {
                const wrapper = document.createElement('div');
                wrapper.className = 'chat-input';
                
                state.filteredProducts.slice(0, 5).forEach(p => {
                    const btn = document.createElement('button');
                    btn.innerHTML = `
                        <strong style="font-size:16px;">${p.model}</strong><br/>
                        <span style="font-size:13px; opacity:0.7;">${p.carrier} · ${p.type} · ${p.support}</span><br/>
                        <span style="color:#00ff88;font-weight:700;">월 ₩${utils.formatPrice(p.total)}</span>
                    `;
                    btn.onclick = () => {
                        wrapper.remove();
                        state.selectedProduct = { ...p };
                        chatUI.addUserMessage(`${p.model} 선택`);
                        dataManager.saveViewedProduct(p);
                        dataManager.updateUrlParams();
                        state.stateIndex++;
                        chatFlow.nextStep();
                    };
                    wrapper.appendChild(btn);
                });
                
                if (!state.hasPreSelectedProduct) {
                    wrapper.appendChild(chatUI.createBackButton());
                }
                
                state.chatContainer.appendChild(wrapper);
                state.chatContainer.scrollTop = state.chatContainer.scrollHeight;
            });
        },
        
        askName: async () => {
            await animations.showAIThinking("정보 입력 준비");
            chatUI.addBotMessage("성함을 입력해주실 수 있을까요?");
            chatUI.showInput('text');
        },
        
        askPhone: async () => {
            await animations.showAIThinking("연락처 입력 준비");
            chatUI.addBotMessage("연락 가능한 전화번호를 남겨주세요.\n('-' 없이 숫자만 입력)");
            chatUI.showInput('phone');
        },
        
        askRegion: async () => {
            await animations.showAIThinking("지역 정보 확인");
            chatUI.addBotMessage("거주 중이신 시(도)를 선택해주세요.");
            chatUI.showInput('select', Object.keys(state.regionToCity));
        },
        
        askCity: async () => {
            await animations.showAIThinking("세부 지역 확인");
            chatUI.addBotMessage("군/구를 선택해주세요.");
            chatUI.showInput('select', state.regionToCity[state.userData.region] || []);
        },
        
        complete: async () => {
            await animations.showAIThinking("정보 검증 중");
            chatUI.addBotMessage("입력해주신 정보를 확인했습니다.\n아래 안내를 마지막으로 확인해주세요.");
            dataManager.fillWebflowFields();
            state.stateIndex++;
            setTimeout(chatFlow.nextStep, 200);
        },
        
        askConsent: () => {
            chatFlow.showConsent();
        },
        
        proceed: (input) => {
            const current = state.states[state.stateIndex];
            chatUI.addUserMessage(input);
            
            switch (current) {
                case 'askName':
                    state.userData.name = input;
                    break;
                case 'askPhone':
                    state.userData.phone = input;
                    break;
                case 'askRegion':
                    state.userData.region = input;
                    break;
                case 'askCity':
                    state.userData.city = input;
                    break;
            }
            
            dataManager.updateUrlParams();
            state.stateIndex++;
            chatFlow.nextStep();
        },
        
        nextStep: async () => {
            const current = state.states[state.stateIndex];
            
            try {
                if (typeof chatFlow[current] === 'function') {
                    await chatFlow[current]();
                }
            } catch (error) {
                console.error('채팅 플로우 오류:', error);
                chatUI.addBotMessage("오류가 발생했습니다. 새로고침 후 다시 시도해주세요.");
            }
        },
        
        showConsent: () => {
            chatUI.addBotMessage("개인정보 수집 및 이용에 동의하십니까?");
            
            setTimeout(() => {
                const wrapper = document.createElement('div');
                wrapper.className = 'chat-input';
                
                const link = document.createElement('a');
                link.href = "/policy";
                link.textContent = "개인정보 처리방침 보기";
                link.style.cssText = "color: #00ff88; font-size: 14px; display:block; margin-bottom:8px; text-decoration: underline;";
                link.onclick = (e) => {
                    e.preventDefault();
                    window.open("/policy", '_blank');
                };
                wrapper.appendChild(link);
                
                const agree = document.createElement('button');
                agree.textContent = "동의";
                agree.onclick = async () => {
                    wrapper.remove();
                    state.consentGiven = true;
                    state.userData.consent = "동의함";
                    chatUI.addUserMessage("동의");
                    
                    await animations.showAIThinking("신청 접수 중");
                    chatUI.addBotMessage("감사합니다. 신청을 접수 중입니다.");
                    
                    dataManager.fillWebflowFields();
                    formSubmit.submitForm();
                };
                wrapper.appendChild(agree);
                
                const disagree = document.createElement('button');
                disagree.textContent = "비동의";
                disagree.onclick = () => {
                    wrapper.remove();
                    chatUI.addUserMessage("비동의");
                    chatUI.addBotMessage("이 페이지를 나가시겠어요?");
                    chatUI.showButtons(["네", "아니요"], (ans) => {
                        if (ans === "네") {
                            window.location.href = "/";
                        } else {
                            chatFlow.showConsent();
                        }
                    }, false);
                };
                wrapper.appendChild(disagree);
                
                if (!state.hasPreSelectedProduct) {
                    wrapper.appendChild(chatUI.createBackButton());
                }
                
                state.chatContainer.appendChild(wrapper);
                state.chatContainer.scrollTop = state.chatContainer.scrollHeight;
            }, 150);
        },
        
        showProductInfo: (product) => {
            setTimeout(() => {
                chatUI.addBotMessage(
                    `선택하신 상품 정보입니다.\n\n` +
                    `📱 ${product.model}\n` +
                    `📡 ${product.carrier} · ${product.type} · ${product.support}\n` +
                    `💰 월 ${utils.formatPrice(product.total)}원\n\n` +
                    `해당 상품을 신청하시겠습니까?`
                );
                
                setTimeout(() => {
                    chatUI.showButtons(['예', '아니요'], (answer) => {
                        if (answer === '예') {
                            state.stateIndex = state.states.indexOf('askName');
                            chatFlow.nextStep();
                        } else {
                            chatUI.addBotMessage("메인 페이지로 돌아갑니다.");
                            setTimeout(() => {
                                window.location.href = '/';
                            }, 800);
                        }
                    }, false);
                }, 500);
            }, 200);
        }
    };
    
    // 📊 데이터 관리
    const dataManager = {
        saveViewedProduct: (product) => {
            try {
                const history = JSON.parse(localStorage.getItem('viewedProducts') || '[]');
                history.unshift({ ...product, time: Date.now() });
                
                // 중복 제거
                const unique = history.filter((v, i, arr) =>
                    i === arr.findIndex(o =>
                        o.model === v.model &&
                        o.carrier === v.carrier &&
                        o.type === v.type &&
                        o.support === v.support
                    )
                );
                
                localStorage.setItem('viewedProducts', JSON.stringify(unique.slice(0, 10)));
            } catch (e) {
                console.log('localStorage not available');
            }
        },
        
        updateUrlParams: () => {
            const params = new URLSearchParams();
            
            if (state.selectedPriceRange.min !== undefined) {
                params.set("price_range", `${state.selectedPriceRange.min}-${state.selectedPriceRange.max}`);
            }
            if (state.selectedBrand) params.set("brand", state.selectedBrand);
            
            Object.entries(state.selectedProduct).forEach(([k, v]) => {
                if (v) params.set(k, v);
            });
            
            Object.entries(state.userData).forEach(([k, v]) => {
                if (v) params.set(k, v);
            });
            
            params.set("consent", state.consentGiven ? "yes" : "no");
            
            history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
        },
        
        fillWebflowFields: () => {
            const fields = {
                name: state.userData.name,
                phone: state.userData.phone,
                region: state.userData.region,
                city: state.userData.city,
                consent: state.consentGiven ? "동의함" : "비동의",
                ...state.selectedProduct
            };
            
            console.log('Webflow 필드 채우기:', fields);
            
            // 일반 필드 채우기
            Object.entries(fields).forEach(([key, value]) => {
                const field = document.getElementById(key) || 
                            document.querySelector(`input[name="${key}"]`);
                if (field && value !== undefined && value !== null) {
                    field.value = value;
                    console.log(`${key} 필드에 값 설정:`, value);
                    
                    // Change 이벤트 발생
                    const event = new Event('change', { bubbles: true });
                    field.dispatchEvent(event);
                }
            });
            
            // Apply 폼 필드도 채우기
            const applyForm = document.querySelector('form[name="apply"]') || 
                            document.querySelector('form#apply');
            if (applyForm) {
                Object.entries(fields).forEach(([key, value]) => {
                    const field = applyForm.querySelector(`input[name="${key}"]`);
                    if (field && value !== undefined && value !== null) {
                        field.value = value;
                        console.log(`Apply 폼 ${key} 필드에 값 설정:`, value);
                    }
                });
            }
        },
        
        checkPreSelectedProduct: () => {
            const params = new URLSearchParams(window.location.search);
            const model = params.get('model');
            const carrier = params.get('carrier');
            const type = params.get('type');
            
            if (model && carrier && type) {
                state.selectedProduct = {
                    model: params.get('model') || '',
                    carrier: params.get('carrier') || '',
                    type: params.get('type') || '',
                    support: params.get('support') || '',
                    principal: params.get('principal') || '',
                    brand: params.get('brand') || '',
                    plan_name: params.get('plan_name') || '',
                    plan_period: params.get('plan_period') || '',
                    plan: params.get('plan') || '',
                    installment: params.get('installment') || '',
                    total: params.get('total') || ''
                };
                
                state.hasPreSelectedProduct = true;
                return true;
            }
            return false;
        }
    };
    
    // 📤 폼 제출 관리
    const formSubmit = {
        submitForm: () => {
            setTimeout(() => {
                const summitButton = document.getElementById('summit');
                const applyForm = document.querySelector('form[name="apply"]') || 
                                document.querySelector('form#apply');
                
                if (summitButton) {
                    console.log('Summit 버튼 클릭 시도');
                    summitButton.click();
                } else if (applyForm) {
                    console.log('Apply 폼 직접 제출 시도');
                    const submitBtn = applyForm.querySelector('button[type="submit"]') || 
                                    applyForm.querySelector('input[type="submit"]') ||
                                    applyForm.querySelector('#summit');
                    if (submitBtn) {
                        submitBtn.click();
                    } else {
                        // 직접 폼 제출
                        const submitEvent = new Event('submit', {
                            bubbles: true,
                            cancelable: true
                        });
                        applyForm.dispatchEvent(submitEvent);
                        
                        if (!submitEvent.defaultPrevented) {
                            applyForm.submit();
                        }
                    }
                } else {
                    console.error('폼 또는 제출 버튼을 찾을 수 없습니다');
                    chatUI.addBotMessage("죄송합니다. 제출 중 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.");
                }
            }, 300);
        }
    };
    
    // 🚀 초기화
    async function initAIChat() {
        try {
            console.log('노피 AI 상담 초기화 시작...');
            
            state.chatContainer = document.getElementById('chatbot');
            if (!state.chatContainer) {
                console.error('chatbot 컨테이너를 찾을 수 없습니다');
                return;
            }
            
            animations.showGreeting();
            
            // 데이터 로드
            const [productData, regionData] = await Promise.all([
                fetch(PRODUCTS_DATA_URL).then(res => {
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    return res.json();
                }),
                fetch(REGIONS_DATA_URL).then(res => {
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    return res.json();
                })
            ]);

            state.products = productData;
            // 지역 데이터는 배열로 제공되므로 {"서울": [..]} 형태의 맵으로 변환
            const regionMap = {};
            if (Array.isArray(regionData)) {
                regionData.forEach(r => {
                    if (r && r.name && Array.isArray(r.districts)) {
                        regionMap[r.name] = r.districts;
                    }
                });
            }
            state.regionToCity = regionMap;

            console.log(`상품 데이터 로드 완료: ${productData.length}개`);
            console.log(`지역 데이터 로드 완료: ${Object.keys(regionMap).length}개 시도`);
            
            await animations.showAIThinking("AI가 맞춤 상품을 분석 중입니다");
            
            // URL 파라미터 체크
            if (dataManager.checkPreSelectedProduct()) {
                console.log('사전 선택된 상품 발견:', state.selectedProduct);
                chatFlow.showProductInfo(state.selectedProduct);
            } else {
                chatFlow.nextStep();
            }
            
            console.log('노피 AI 상담 초기화 완료');
            
        } catch (error) {
            console.error('데이터 로딩 실패:', error);
            chatUI.addBotMessage("죄송합니다. 서비스 연결에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
    }
    
    // 접근성 개선
    function improveAccessibility() {
        // 키보드 네비게이션 지원
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const backBtn = document.querySelector('.chat-back');
                if (backBtn) {
                    backBtn.click();
                }
            }
        });
        
        // 포커스 관리
        const observer = new MutationObserver(() => {
            const newInput = state.chatContainer.querySelector('.chat-input input:last-child, .chat-input select:last-child');
            if (newInput) {
                setTimeout(() => newInput.focus(), 100);
            }
        });
        
        if (state.chatContainer) {
            observer.observe(state.chatContainer, { childList: true, subtree: true });
        }
    }
    
    // 에러 핸들링
    function handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        
        // 사용자에게 친화적인 에러 메시지
        if (context === 'Form submission') {
            chatUI.addBotMessage("죄송합니다. 신청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
    }
    
    // DOM 준비 확인 및 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initAIChat();
            improveAccessibility();
        });
    } else {
        // DOM이 이미 로드된 경우
        initAIChat();
        improveAccessibility();
    }
    
    // 전역 에러 핸들러
    window.addEventListener('error', (e) => {
        handleError(e.error, 'Global');
    });
    
    // Promise 에러 핸들러
    window.addEventListener('unhandledrejection', (e) => {
        handleError(e.reason, 'Promise');
        e.preventDefault();
    });
    
    // 페이지 언로드 시 정리
    window.addEventListener('beforeunload', () => {
        // 필요한 정리 작업
        dataManager.updateUrlParams();
    });
    
})();
