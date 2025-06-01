// AI 상담 페이지 스크립트
// 전역 네임스페이스
window.NofeeChat = window.NofeeChat || {};

// 첫 번째 IIFE: 상태와 기본 함수 정의
(function() {
  const NC = window.NofeeChat;

  // GitHub Pages 기본 URL (커스텀 도메인 사용 시에도 동일)
  const BASE_URL = 'https://jacob-po.github.io/nofee-webflow';

  // 외부에서 경로를 덮어쓸 수 있도록 전역 설정을 확인
  const productsUrl = window.NofeeDataConfig?.productsUrl || `${BASE_URL}/data/products.json`;
  const regionsUrl = window.NofeeDataConfig?.regionsUrl || `${BASE_URL}/data/regions.json`;

  // 상태 변수들
  NC.chatContainer = null;
  NC.states = ['askPrice', 'askBrand', 'askProduct', 'askName', 'askPhone', 'askRegion', 'askCity', 'complete', 'askConsent'];
  NC.stateIndex = 0;
  NC.consentGiven = false;
  NC.hasPreSelectedProduct = false;

  NC.userData = { name: '', phone: '', region: '', city: '', consent: '' };
  NC.selectedProduct = {};
  NC.filteredProducts = [];
  NC.selectedPriceRange = {};
  NC.selectedBrand = '';
  NC.products = [];
  NC.regionToCity = {};

  // 기본 인사
  NC.showGreeting = function() {
    NC.addBotMessage('안녕하세요 고객님! 저는 AI 상담원입니다.');
  };

  // AI 처리 중 표시
  NC.showAIThinking = function(text = 'AI가 맞춤 상품을 분석 중입니다') {
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
    NC.chatContainer.appendChild(thinking);
    NC.chatContainer.scrollTop = NC.chatContainer.scrollHeight;

    return new Promise(resolve => {
      setTimeout(() => {
        thinking.remove();
        resolve();
      }, 800);
    });
  };

  // 약간의 지연 후 callback 실행
  NC.showLoader = function(callback) {
    setTimeout(callback, 100);
  };

  // 봇 메시지 출력 (타이핑 효과)
  NC.addBotMessage = function(msg, delay = 5) {
    const div = document.createElement('div');
    div.className = 'chat-bubble bot';
    NC.chatContainer.appendChild(div);
    let i = 0;
    function typeChar() {
      if (i <= msg.length) {
        div.innerText = msg.slice(0, i++);
        setTimeout(typeChar, delay);
      } else {
        NC.chatContainer.scrollTop = NC.chatContainer.scrollHeight;
      }
    }
    typeChar();
  };

  // 사용자 메시지 출력
  NC.addUserMessage = function(msg) {
    const div = document.createElement('div');
    div.className = 'chat-bubble user';
    div.innerText = msg;
    NC.chatContainer.appendChild(div);
    NC.chatContainer.scrollTop = NC.chatContainer.scrollHeight;
  };

  // 이전 단계로 돌아가기 버튼
  NC.createBackButton = function() {
    const back = document.createElement('button');
    back.className = 'chat-back';
    back.textContent = '← 이전으로 돌아가기';
    back.onclick = () => {
      if (NC.stateIndex > 0) {
        NC.stateIndex--;
        const inputEls = NC.chatContainer.querySelectorAll('.chat-input, .chat-bubble.user');
        if (inputEls.length) inputEls[inputEls.length - 1].remove();
        NC.nextStep();
      }
    };
    return back;
  };

  // 버튼 목록 표시
  NC.showButtons = function(labels, callback, showBack = true) {
    NC.showLoader(() => {
      const wrapper = document.createElement('div');
      wrapper.className = 'chat-input';
      labels.forEach(label => {
        const btn = document.createElement('button');
        btn.innerText = label;
        btn.onclick = () => {
          wrapper.remove();
          NC.addUserMessage(label);
          callback(label);
        };
        wrapper.appendChild(btn);
      });
      if (showBack && !NC.hasPreSelectedProduct) wrapper.appendChild(NC.createBackButton());
      NC.chatContainer.appendChild(wrapper);
      NC.chatContainer.scrollTop = NC.chatContainer.scrollHeight;
    });
  };

  // 입력창 표시 (텍스트/셀렉트)
  NC.showInput = function(type, options = [], showBack = true) {
    NC.showLoader(() => {
      const wrapper = document.createElement('div');
      wrapper.className = 'chat-input';
      if (type === 'select') {
        const select = document.createElement('select');
        select.innerHTML = '<option value="">선택해주세요</option>' + options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
        select.onchange = () => {
          if (select.value) {
            wrapper.remove();
            NC.proceed(select.value);
          }
        };
        wrapper.appendChild(select);
      } else {
        const input = document.createElement('input');
        input.placeholder = '입력해주세요';
        wrapper.appendChild(input);
        const btn = document.createElement('button');
        btn.textContent = '입력';
        btn.onclick = () => {
          if (input.value.trim()) {
            wrapper.remove();
            NC.proceed(input.value.trim());
          }
        };
        wrapper.appendChild(btn);
      }
      if (showBack && !NC.hasPreSelectedProduct) wrapper.appendChild(NC.createBackButton());
      NC.chatContainer.appendChild(wrapper);
      NC.chatContainer.scrollTop = NC.chatContainer.scrollHeight;
    });
  };

  // 상품 정보 표시
  NC.showProductInfo = function(product) {
    setTimeout(() => {
      NC.addBotMessage(`선택하신 상품 정보입니다.\n\n📱 ${product.model}\n📡 ${product.carrier} · ${product.type} · ${product.support}\n💰 월 ${Number(product.total).toLocaleString()}원\n\n해당 상품을 신청하시겠습니까?`);
      setTimeout(() => {
        NC.showButtons(['예', '아니요'], (answer) => {
          if (answer === '예') {
            NC.stateIndex = NC.states.indexOf('askName');
            NC.nextStep();
          } else {
            NC.addBotMessage('메인 페이지로 돌아갑니다.');
            setTimeout(() => {
              window.location.href = '/';
            }, 800);
          }
        }, false);
      }, 500);
    }, 200);
  };

  // 요금대 질문
  NC.askPrice = async function() {
    await NC.showAIThinking('요금대 분석 중');
    NC.addBotMessage('노피에서 월 요금대를 기준으로 상품을 추천드릴게요.\n선호하시는 요금대를 선택해주세요.');
    const ranges = [
      { label: '3~5만 원', min: 30000, max: 50000 },
      { label: '5~7만 원', min: 50000, max: 70000 },
      { label: '7~9만 원', min: 70000, max: 90000 },
      { label: '9~10만 원', min: 90000, max: 100000 },
      { label: '10만 원 이상', min: 100000, max: Infinity }
    ];
    NC.showButtons(ranges.map(r => r.label), (label) => {
      const range = ranges.find(r => r.label === label);
      NC.selectedPriceRange = range;
      NC.filteredProducts = NC.products.filter(p => +p.total >= range.min && +p.total < range.max);
      NC.updateUrlParams();
      NC.stateIndex++;
      NC.nextStep();
    }, false);
  };

  // 브랜드 질문
  NC.askBrand = async function() {
    await NC.showAIThinking('브랜드 매칭 중');
    NC.addBotMessage('어느 브랜드를 원하시나요?\n고객님의 선택을 기다리고 있어요.');
    const brands = [...new Set(NC.filteredProducts.map(p => p.brand))];
    NC.showButtons(brands, (brand) => {
      NC.selectedBrand = brand;
      NC.filteredProducts = NC.filteredProducts.filter(p => p.brand === brand);
      NC.updateUrlParams();
      NC.stateIndex++;
      NC.nextStep();
    });
  };

  // 상품 선택 질문
  NC.askProduct = async function() {
    await NC.showAIThinking('최적 상품 추천 중');
    NC.addBotMessage('추천드릴 수 있는 상품 목록이에요.\n원하시는 모델을 골라주세요.');
    NC.showLoader(() => {
      const wrapper = document.createElement('div');
      wrapper.className = 'chat-input';
      NC.filteredProducts.slice(0, 5).forEach(p => {
        const btn = document.createElement('button');
        btn.innerHTML = `
          <strong style="font-size:16px;">${p.model}</strong><br/>
          <span style="font-size:13px; opacity:0.7;">${p.carrier} · ${p.type} · ${p.support}</span><br/>
          <span style="color:#00ff88;font-weight:700;">월 ₩${Number(p.total).toLocaleString()}</span>
        `;
        btn.onclick = () => {
          wrapper.remove();
          NC.selectedProduct = { ...p };
          NC.addUserMessage(`${p.model} 선택`);
          NC.saveViewedProduct(p);
          NC.updateUrlParams();
          NC.stateIndex++;
          NC.nextStep();
        };
        wrapper.appendChild(btn);
      });
      if (!NC.hasPreSelectedProduct) wrapper.appendChild(NC.createBackButton());
      NC.chatContainer.appendChild(wrapper);
      NC.chatContainer.scrollTop = NC.chatContainer.scrollHeight;
    });
  };
})();

// 두 번째 IIFE: 진행 로직 및 초기화
(function() {
  const NC = window.NofeeChat;

  // 입력 후 다음 단계로
  NC.proceed = function(input) {
    const current = NC.states[NC.stateIndex];
    NC.addUserMessage(input);

    if (current === 'askName') NC.userData.name = input;
    else if (current === 'askPhone') NC.userData.phone = input;
    else if (current === 'askRegion') NC.userData.region = input;
    else if (current === 'askCity') NC.userData.city = input;

    NC.updateUrlParams();
    NC.stateIndex++;
    NC.nextStep();
  };

  // Webflow 필드 채우기
  NC.fillWebflowFields = function() {
    const fields = {
      name: NC.userData.name,
      phone: NC.userData.phone,
      region: NC.userData.region,
      city: NC.userData.city,
      consent: NC.consentGiven ? '동의함' : '비동의',
      ...NC.selectedProduct
    };

    Object.entries(fields).forEach(([key, value]) => {
      const field = document.getElementById(key) || document.querySelector(`input[name="${key}"]`);
      if (field && value) {
        field.value = value;
        console.log(`${key} 필드에 값 설정:`, value);
      }
    });

    const applyForm = document.querySelector('form[name="apply"]') || document.querySelector('form#apply');
    if (applyForm) {
      Object.entries(fields).forEach(([key, value]) => {
        const field = applyForm.querySelector(`input[name="${key}"]`);
        if (field && value) {
          field.value = value;
          console.log(`Apply 폼 ${key} 필드에 값 설정:`, value);
        }
      });
    }
  };

  // URL 파라미터 업데이트
  NC.updateUrlParams = function() {
    const params = new URLSearchParams();
    if (NC.selectedPriceRange.min !== undefined) params.set('price_range', `${NC.selectedPriceRange.min}-${NC.selectedPriceRange.max}`);
    if (NC.selectedBrand) params.set('brand', NC.selectedBrand);
    Object.entries(NC.selectedProduct).forEach(([k, v]) => params.set(k, v));
    Object.entries(NC.userData).forEach(([k, v]) => v && params.set(k, v));
    params.set('consent', NC.consentGiven ? 'yes' : 'no');
    history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
  };

  // 다음 스텝 진행
  NC.nextStep = async function() {
    const current = NC.states[NC.stateIndex];
    if (current === 'askPrice') NC.askPrice();
    else if (current === 'askBrand') NC.askBrand();
    else if (current === 'askProduct') NC.askProduct();
    else if (current === 'askName') {
      await NC.showAIThinking('정보 입력 준비');
      NC.addBotMessage('성함을 입력해주실 수 있을까요?');
      NC.showInput('text');
    } else if (current === 'askPhone') {
      await NC.showAIThinking('연락처 입력 준비');
      NC.addBotMessage('연락 가능한 전화번호를 남겨주세요.');
      NC.showInput('text');
    } else if (current === 'askRegion') {
      await NC.showAIThinking('지역 정보 확인');
      NC.addBotMessage('거주 중이신 시(도)를 선택해주세요.');
      NC.showInput('select', Object.keys(NC.regionToCity));
    } else if (current === 'askCity') {
      await NC.showAIThinking('세부 지역 확인');
      NC.addBotMessage('군/구를 선택해주세요.');
      NC.showInput('select', NC.regionToCity[NC.userData.region] || []);
    } else if (current === 'complete') {
      await NC.showAIThinking('정보 검증 중');
      NC.addBotMessage('입력해주신 정보를 확인했습니다.\n아래 안내를 마지막으로 확인해주세요.');
      NC.fillWebflowFields();
      const summary = [];
      if (NC.userData.name) summary.push(`\uD83D\uDC64 ${NC.userData.name}`);
      if (NC.userData.phone) summary.push(`\uD83D\uDCF1 ${NC.userData.phone}`);
      if (NC.userData.region) summary.push(`\uD83D\uDCCD ${NC.userData.region} ${NC.userData.city || ''}`.trim());
      if (NC.selectedProduct.model) summary.push(`\uD83D\uDCF2 ${NC.selectedProduct.model}`);
      if (summary.length) {
        NC.addBotMessage('요약 정보:\n' + summary.join('\n'));
      }
      NC.stateIndex++;
      setTimeout(NC.nextStep, 200);
    } else if (current === 'askConsent') {
      NC.showConsent();
    }
  };

  // 개인정보 동의 여부
  NC.showConsent = function() {
    NC.addBotMessage('개인정보 수집 및 이용에 동의하십니까?');
    setTimeout(() => {
      const wrapper = document.createElement('div');
      wrapper.className = 'chat-input';

      const link = document.createElement('a');
      link.href = '/policy';
      link.textContent = '개인정보 처리방침 보기';
      link.style.cssText = 'color: #00ff88; font-size: 14px; display:block; margin-bottom:8px; text-decoration: underline;';
      link.onclick = (e) => {
        e.preventDefault();
        window.location.href = '/policy';
      };
      wrapper.appendChild(link);

      const agree = document.createElement('button');
      agree.textContent = '동의';
      agree.onclick = async () => {
        wrapper.remove();
        NC.consentGiven = true;
        NC.userData.consent = '동의함';
        NC.addUserMessage('동의');

        await NC.showAIThinking('신청 접수 중');
        NC.addBotMessage('감사합니다. 신청을 접수 중입니다.');

        NC.fillWebflowFields();

        setTimeout(() => {
          const summitButton = document.getElementById('summit');
          const applyForm = document.querySelector('form[name="apply"]') || document.querySelector('form#apply');

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
              applyForm.submit();
            }
          } else {
            console.log('폼 또는 제출 버튼을 찾을 수 없습니다');
            NC.addBotMessage('죄송합니다. 제출 중 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.');
          }
        }, 300);
      };
      wrapper.appendChild(agree);

      const disagree = document.createElement('button');
      disagree.textContent = '비동의';
      disagree.onclick = () => {
        wrapper.remove();
        NC.addUserMessage('비동의');
        NC.addBotMessage('이 페이지를 나가시겠어요?');
        NC.showButtons(['네', '아니요'], (ans) => {
          if (ans === '네') location.href = 'https://phone.nofee.team';
          else NC.showConsent();
        }, false);
      };
      wrapper.appendChild(disagree);

      if (!NC.hasPreSelectedProduct) wrapper.appendChild(NC.createBackButton());
      NC.chatContainer.appendChild(wrapper);
      NC.chatContainer.scrollTop = NC.chatContainer.scrollHeight;
    }, 150);
  };

  // 로컬스토리지에 상품 기록 저장
  NC.saveViewedProduct = function(product) {
    try {
      const history = JSON.parse(localStorage.getItem('viewedProducts') || '[]');
      history.unshift({ ...product, time: Date.now() });
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
  };

  // URL 파라미터로 선택된 상품 확인
  NC.checkPreSelectedProduct = function() {
    const params = new URLSearchParams(window.location.search);
    const model = params.get('model');
    const carrier = params.get('carrier');
    const type = params.get('type');

    if (model && carrier && type) {
      NC.selectedProduct = {
        model: params.get('model') || '',
        carrier: params.get('carrier') || '',
        type: params.get('type') || '',
        support: params.get('support') || '',
        principal: params.get('principal') || '',
        brand: params.get('brand') || '',
        plan_name: params.get('plan_name') || '',
        plan_period: params.get('plan_period') || '',
        total: params.get('total') || ''
      };
      NC.hasPreSelectedProduct = true;
      return true;
    }
    return false;
  };

  // 디버그 패널 설정
  function setupDebugPanel() {
    let statusEl = document.getElementById('debugStatus');
    if (!statusEl) {
      const panel = document.createElement('div');
      panel.className = 'debug-panel';
      panel.innerHTML = '<h4>디버그 정보</h4><div id="debugStatus"></div>';
      document.body.appendChild(panel);
      statusEl = panel.querySelector('#debugStatus');
    }

    function addDebug(message, isError = false) {
      const div = document.createElement('div');
      div.className = 'status ' + (isError ? 'error' : 'success');
      div.textContent = message;
      statusEl.appendChild(div);
    }

    const origLog = console.log;
    const origErr = console.error;
    console.log = (...args) => { origLog.apply(console, args); addDebug(args.join(' ')); };
    console.error = (...args) => { origErr.apply(console, args); addDebug(args.join(' '), true); };

    window.addEventListener('load', () => addDebug('페이지 로드 완료'));
  }

  // 초기화 함수
  NC.init = function() {
    setupDebugPanel();

    NC.chatContainer = document.getElementById('chatbot');
    if (!NC.chatContainer) {
      console.warn('chatbot 컨테이너를 찾을 수 없어 새로 생성합니다');
      NC.chatContainer = document.createElement('div');
      NC.chatContainer.id = 'chatbot';
      const target = document.querySelector('.nofee-embed') || document.body;
      target.appendChild(NC.chatContainer);
    }

    NC.showGreeting();

    Promise.all([
      fetch(productsUrl).then(res => res.json()),
      fetch(regionsUrl).then(res => res.json())
    ]).then(async ([productData, regionData]) => {
      NC.products = productData;
      NC.regionToCity = regionData;

      await NC.showAIThinking('AI가 맞춤 상품을 분석 중입니다');

      if (NC.checkPreSelectedProduct()) {
        NC.showProductInfo(NC.selectedProduct);
      } else {
        NC.nextStep();
      }
    }).catch(error => {
      console.error('데이터 로딩 실패:', error);
      NC.addBotMessage('죄송합니다. 서비스 연결에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    });
  };

  // DOM 준비되면 초기화 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', NC.init);
  } else {
    NC.init();
  }
})();
