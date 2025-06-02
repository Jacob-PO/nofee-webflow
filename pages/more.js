<!-- 🚀 노피 상품검색 - 웹플로우 HTML Embed 코드 -->
<!-- CSS와 JS는 GitHub에서 관리 -->

<!-- 📱 CSS 파일 로드 -->
<link rel="stylesheet" href="https://jacob-po.github.io/nofee-webflow/styles/more.css?v=2.0.0">

<!-- 🎯 HTML 구조 -->
<div class="nofee-embed">
    <div class="container">
        <!-- 페이지 헤더 -->
        <div class="page-header">
            <h1 class="page-title">노피 상품 검색</h1>
            <p class="page-subtitle">원하는 조건으로 최적의 휴대폰 요금제를 찾아보세요</p>
        </div>
        
        <!-- 필터 영역 -->
        <div class="filters">
            <!-- 필터 버튼들 -->
            <div class="filter-row">
                <!-- 통신사 필터 -->
                <div class="filter-button" data-category="carrier">
                    <span class="filter-text">통신사</span>
                    <span>▼</span>
                    <div class="dropdown-menu" data-target="carrier">
                        <div class="dropdown-item" data-value="">전체</div>
                        <div class="dropdown-item" data-value="SKT">SK텔레콤</div>
                        <div class="dropdown-item" data-value="KT">KT</div>
                        <div class="dropdown-item" data-value="LGU">LG유플러스</div>
                    </div>
                </div>
                
                <!-- 제조사 필터 -->
                <div class="filter-button" data-category="brand">
                    <span class="filter-text">제조사</span>
                    <span>▼</span>
                    <div class="dropdown-menu" data-target="brand">
                        <div class="dropdown-item" data-value="">전체</div>
                        <div class="dropdown-item" data-value="삼성">삼성</div>
                        <div class="dropdown-item" data-value="애플">애플</div>
                    </div>
                </div>
                
                <!-- 가입유형 필터 -->
                <div class="filter-button" data-category="type">
                    <span class="filter-text">가입유형</span>
                    <span>▼</span>
                    <div class="dropdown-menu" data-target="type">
                        <div class="dropdown-item" data-value="">전체</div>
                        <div class="dropdown-item" data-value="번호이동">번호이동</div>
                        <div class="dropdown-item" data-value="기기변경">기기변경</div>
                        <div class="dropdown-item" data-value="신규가입">신규가입</div>
                    </div>
                </div>
                
                <!-- 개통옵션 필터 -->
                <div class="filter-button" data-category="support">
                    <span class="filter-text">개통옵션</span>
                    <span>▼</span>
                    <div class="dropdown-menu" data-target="support">
                        <div class="dropdown-item" data-value="">전체</div>
                        <div class="dropdown-item" data-value="공시지원">공시지원</div>
                        <div class="dropdown-item" data-value="선택약정">선택약정</div>
                    </div>
                </div>
                
                <!-- 정렬 필터 -->
                <div class="filter-button" data-category="sort">
                    <span class="filter-text">정렬</span>
                    <span>▼</span>
                    <div class="dropdown-menu" data-target="sort">
                        <div class="dropdown-item" data-value="">기본순</div>
                        <div class="dropdown-item" data-value="asc">월납부금 낮은순</div>
                        <div class="dropdown-item" data-value="desc">월납부금 높은순</div>
                        <div class="dropdown-item" data-value="discount">할인율 높은순</div>
                    </div>
                </div>
            </div>
            
            <!-- 활성 필터 표시 -->
            <div class="active-filters" id="activeFilters"></div>
        </div>
        
        <!-- 상품 개수 -->
        <div class="product-count">
            총 <strong id="productCount">0</strong>개 상품
        </div>
        
        <!-- 상품 리스트 -->
        <div class="product-list" id="productList">
            <div class="loading">
                <div class="spinner"></div>
                <p>상품 데이터를 불러오는 중...</p>
            </div>
        </div>
        
        <!-- 더보기 버튼 -->
        <div class="load-more" id="loadMore" style="display: none;">
            <button class="load-more-btn" id="loadMoreBtn">
                <span id="loadMoreText">상품 더 보기</span>
            </button>
        </div>
    </div>
</div>

<!-- 🔍 디버그 패널 (Ctrl+D로 토글) -->
<div class="nofee-debug-panel" id="debugPanel">
    <h4>🔍 데이터 로드 상태</h4>
    <div id="debugStatus"></div>
</div>

<!-- 🚀 JavaScript 로드 -->
<script>
// 🔧 즉시 실행 함수로 전역 오염 방지
(function() {
    'use strict';
    
    console.log('🔥 노피 상품검색 v2.0 시작');
    
    // 🔍 디버그 함수
    function updateDebug(message, type = 'info') {
        const panel = document.getElementById('debugStatus');
        if (!panel) return;
        
        const div = document.createElement('div');
        div.className = `nofee-debug-status nofee-debug-${type}`;
        div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        panel.appendChild(div);
        
        // 최대 10개 메시지만 유지
        while (panel.children.length > 10) {
            panel.removeChild(panel.firstChild);
        }
        
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    // 🎯 기본 드롭다운 기능
    function initDropdowns() {
        document.addEventListener('click', function(e) {
            const filterButton = e.target.closest('.filter-button');
            
            if (filterButton) {
                e.stopPropagation();
                
                // 모든 드롭다운 닫기
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    if (menu.parentElement !== filterButton) {
                        menu.classList.remove('show');
                    }
                });
                
                // 클릭된 드롭다운 토글
                const dropdown = filterButton.querySelector('.dropdown-menu');
                if (dropdown) {
                    dropdown.classList.toggle('show');
                    updateDebug(`드롭다운 토글: ${filterButton.dataset.category}`, 'info');
                }
                return;
            }
            
            // 드롭다운 아이템 클릭
            const dropdownItem = e.target.closest('.dropdown-item');
            if (dropdownItem) {
                e.stopPropagation();
                
                const dropdown = dropdownItem.closest('.dropdown-menu');
                const filterButton = dropdown.parentElement;
                const category = filterButton.dataset.category;
                const value = dropdownItem.dataset.value;
                
                // 선택된 아이템 표시
                dropdown.querySelectorAll('.dropdown-item').forEach(item => {
                    item.classList.remove('selected');
                });
                dropdownItem.classList.add('selected');
                
                // 필터 텍스트 업데이트
                const filterText = filterButton.querySelector('.filter-text');
                if (filterText) {
                    filterText.textContent = value || category;
                }
                
                // 드롭다운 닫기
                dropdown.classList.remove('show');
                
                updateDebug(`필터 선택: ${category} = ${value}`, 'success');
                
                // 외부 필터 함수 호출 (있다면)
                if (window.applyFilter) {
                    window.applyFilter(category, value);
                }
                
                return;
            }
            
            // 외부 클릭 시 모든 드롭다운 닫기
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });
        });
        
        updateDebug('드롭다운 이벤트 리스너 설정 완료', 'success');
    }
    
    // 🎯 외부 스크립트 로드
    function loadExternalScript() {
        const script = document.createElement('script');
        script.src = 'https://jacob-po.github.io/nofee-webflow/pages/more.js?v=' + Date.now();
        
        script.onload = function() {
            updateDebug('✅ 외부 스크립트 로드 성공', 'success');
            
            // 초기화 함수 실행
            setTimeout(() => {
                if (window.initProductSearch) {
                    updateDebug('🚀 상품 검색 초기화 시작', 'info');
                    try {
                        window.initProductSearch();
                        updateDebug('상품 검색 초기화 완료', 'success');
                    } catch (error) {
                        updateDebug('초기화 에러: ' + error.message, 'error');
                        showFallbackContent();
                    }
                } else {
                    updateDebug('초기화 함수를 찾을 수 없음', 'error');
                    setTimeout(() => {
                        if (window.initProductSearch) {
                            window.initProductSearch();
                        } else {
                            showFallbackContent();
                        }
                    }, 2000);
                }
            }, 1000);
        };
        
        script.onerror = function() {
            updateDebug('❌ 외부 스크립트 로드 실패', 'error');
            showFallbackContent();
        };
        
        document.head.appendChild(script);
        updateDebug('외부 스크립트 로드 시작...', 'info');
    }
    
    // 🎯 폴백 컨텐츠 표시
    function showFallbackContent() {
        const productList = document.getElementById('productList');
        if (!productList) return;
        
        productList.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔄</div>
                <h3>새로고침해주세요</h3>
                <p>데이터 로딩 중 문제가 발생했습니다</p>
                <button onclick="location.reload()" style="
                    margin-top: 20px;
                    padding: 12px 24px;
                    background: #5c27fe;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">새로고침</button>
            </div>
        `;
        
        updateDebug('폴백 컨텐츠 표시', 'info');
    }
    
    // 🎯 디버그 패널 토글 (Ctrl+D)
    function initDebugPanel() {
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                const panel = document.getElementById('debugPanel');
                if (panel) {
                    panel.classList.toggle('show');
                }
            }
        });
    }
    
    // 🚀 초기화 실행
    function init() {
        updateDebug('시스템 초기화 시작', 'info');
        
        // DOM 로드 확인
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                initDropdowns();
                initDebugPanel();
                loadExternalScript();
            });
        } else {
            initDropdowns();
            initDebugPanel();
            loadExternalScript();
        }
        
        updateDebug('기본 UI 로드 완료', 'success');
    }
    
    // 10초 타임아웃
    setTimeout(() => {
        const productList = document.getElementById('productList');
        if (productList && productList.querySelector('.loading')) {
            updateDebug('10초 타임아웃 - 폴백 실행', 'error');
            showFallbackContent();
        }
    }, 10000);
    
    // 즉시 초기화
    init();
    
})();
</script>
