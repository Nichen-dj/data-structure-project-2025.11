document.addEventListener('DOMContentLoaded', function() {
    // DOM元素获取
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const suggestionsContainer = document.getElementById('suggestions');
    const resultsContainer = document.getElementById('results');
    const resultsStats = document.getElementById('results-stats');
    const loadingIndicator = document.getElementById('loading');
    const noResultsIndicator = document.getElementById('no-results');

    // API配置（与后端服务器端口一致）
    const API_BASE_URL = 'http://localhost:8080';
    const SEARCH_API = `${API_BASE_URL}/search`;
    const SUGGEST_API = `${API_BASE_URL}/suggest`;

    // 防抖函数（避免输入频繁触发请求）
    function debounce(func, wait = 300) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // 获取搜索建议（调用/suggest API）
    const fetchSuggestions = debounce(async function(query) {
        suggestionsContainer.innerHTML = '';
        if (query.trim().length < 2) return;

        try {
            // 发送建议请求（编码查询词避免特殊字符问题）
            const response = await fetch(`${SUGGEST_API}?q=${encodeURIComponent(query.trim())}`);
            if (!response.ok) throw new Error(`HTTP错误：${response.status}`);
            
            const suggestions = await response.json();
            
            if (suggestions.length === 0) {
                suggestionsContainer.innerHTML = '<div class="suggestion-item">无匹配建议</div>';
                return;
            }

            // 渲染建议列表（高亮前缀）
            suggestions.forEach(suggestion => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                // 高亮与输入匹配的前缀
                const highlighted = suggestion.replace(
                    new RegExp(`^${query.trim()}`, 'i'),
                    match => `<strong>${match}</strong>`
                );
                item.innerHTML = highlighted;
                
                // 点击建议自动填充并搜索
                item.addEventListener('click', () => {
                    searchInput.value = suggestion;
                    suggestionsContainer.innerHTML = '';
                    performSearch(suggestion);
                });
                
                suggestionsContainer.appendChild(item);
            });
        } catch (error) {
            console.error('获取建议失败：', error);
            suggestionsContainer.innerHTML = '<div class="suggestion-item">建议加载失败</div>';
        }
    });

    // 执行搜索（调用/search API）
    async function performSearch(query) {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
            alert('请输入查询词！');
            return;
        }

        // 显示加载状态
        loadingIndicator.style.display = 'block';
        resultsContainer.innerHTML = '';
        resultsStats.textContent = '';
        noResultsIndicator.style.display = 'none';

        try {
            // 发送搜索请求
            const response = await fetch(`${SEARCH_API}?q=${encodeURIComponent(trimmedQuery)}`);
            if (!response.ok) throw new Error(`搜索请求失败：${response.statusText}`);
            
            const results = await response.json();
            const searchTime = (Math.random() * 0.5).toFixed(2); // 模拟搜索时间

            // 隐藏加载状态，显示结果统计
            loadingIndicator.style.display = 'none';
            resultsStats.textContent = `找到 ${results.length} 个结果（搜索时间：${searchTime} 秒）`;

            // 无结果处理
            if (results.length === 0) {
                noResultsIndicator.style.display = 'block';
                return;
            }

            // 渲染搜索结果（高亮匹配词）
            results.forEach((result, index) => {
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                
                // 高亮预览中的查询词
                const highlightedPreview = result.preview.replace(
                    new RegExp(trimmedQuery, 'gi'), // 全局+不区分大小写匹配
                    match => `<strong>${match}</strong>`
                );

                resultItem.innerHTML = `
                    <div class="result-rank">${index + 1}</div>
                    <div class="result-content">
                        <div class="result-path">${result.doc_path}</div>
                        <div class="result-score">相关性得分：${result.score.toFixed(4)}</div>
                        <div class="result-preview">${highlightedPreview}</div>
                    </div>
                `;
                resultsContainer.appendChild(resultItem);
            });
        } catch (error) {
            // 错误处理
            loadingIndicator.style.display = 'none';
            resultsStats.textContent = '搜索过程中出现错误，请重试！';
            console.error('搜索失败：', error);
        }
    }

    // 事件监听
    searchInput.addEventListener('input', (e) => fetchSuggestions(e.target.value)); // 输入时获取建议
    searchButton.addEventListener('click', () => { // 点击搜索按钮
        performSearch(searchInput.value);
        suggestionsContainer.innerHTML = ''; // 隐藏建议列表
    });
    searchInput.addEventListener('keypress', (e) => { // 回车搜索
        if (e.key === 'Enter') {
            performSearch(searchInput.value);
            suggestionsContainer.innerHTML = '';
        }
    });
    // 点击页面其他区域隐藏建议列表
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.innerHTML = '';
        }
    });

    // 页面加载后自动聚焦搜索框
    searchInput.focus();
});