console.log('%cCopyright © 2024 yozz.net and 2026 mica',
    'background-color: #37229f; color: white; font-size: 24px; font-weight: bold; padding: 10px;'
);
console.log('%c   /\\_/\\', 'color: #8B4513; font-size: 20px;');
console.log('%c  ( o.o )', 'color: #8B4513; font-size: 20px;');
console.log(' %c  > ^ <', 'color: #8B4513; font-size: 20px;');
console.log('  %c /  ~ \\', 'color: #8B4513; font-size: 20px;');
console.log('  %c/______\\', 'color: #8B4513; font-size: 20px;');

document.addEventListener('contextmenu', function (event) {
    event.preventDefault();
});

function handlePress(event) {
    this.classList.add('pressed');
}

function handleRelease(event) {
    this.classList.remove('pressed');
}

function handleCancel(event) {
    this.classList.remove('pressed');
}

var buttons = document.querySelectorAll('.projectItem');
buttons.forEach(function (button) {
    button.addEventListener('mousedown', handlePress);
    button.addEventListener('mouseup', handleRelease);
    button.addEventListener('mouseleave', handleCancel);
    button.addEventListener('touchstart', handlePress);
    button.addEventListener('touchend', handleRelease);
    button.addEventListener('touchcancel', handleCancel);
});

function toggleClass(selector, className) {
    var elements = document.querySelectorAll(selector);
    elements.forEach(function (element) {
        element.classList.toggle(className);
    });
}

function pop(imageURL) {
    var tcMainElement = document.querySelector(".tc-img");
    if (imageURL) {
        tcMainElement.src = imageURL;
    }
    toggleClass(".tc-main", "active");
    toggleClass(".tc", "active");
}

var tc = document.getElementsByClassName('tc');
var tc_main = document.getElementsByClassName('tc-main');
tc[0].addEventListener('click', function (event) {
    pop();
});
tc_main[0].addEventListener('click', function (event) {
    event.stopPropagation();
});



function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i];
        while (cookie.charAt(0) == ' ') {
            cookie = cookie.substring(1, cookie.length);
        }
        if (cookie.indexOf(nameEQ) == 0) {
            return cookie.substring(nameEQ.length, cookie.length);
        }
    }
    return null;
}















document.addEventListener('DOMContentLoaded', function () {






    var html = document.querySelector('html');
    var themeState = getCookie("themeState") || "Light";
    var tanChiShe = document.getElementById("tanChiShe");






    function changeTheme(theme) {
        tanChiShe.src = "./static/svg/snake-" + theme + ".svg";
        html.dataset.theme = theme;
        setCookie("themeState", theme, 365);
        themeState = theme;
    }







    var Checkbox = document.getElementById('myonoffswitch')
    Checkbox.addEventListener('change', function () {
        if (themeState == "Dark") {
            changeTheme("Light");
        } else if (themeState == "Light") {
            changeTheme("Dark");
        } else {
            changeTheme("Dark");
        }
    });



    if (themeState == "Dark") {
        Checkbox.checked = false;
    }

    changeTheme(themeState);

















   

    var fpsElement = document.createElement('div');
    fpsElement.id = 'fps';
    fpsElement.style.zIndex = '10000';
    fpsElement.style.position = 'fixed';
    fpsElement.style.left = '0';
    document.body.insertBefore(fpsElement, document.body.firstChild);

    var showFPS = (function () {
        var requestAnimationFrame = window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };

        var fps = 0,
            last = Date.now(),
            offset, step, appendFps;

        step = function () {
            offset = Date.now() - last;
            fps += 1;

            if (offset >= 1000) {
                last += offset;
                appendFps(fps);
                fps = 0;
            }

            requestAnimationFrame(step);
        };

        appendFps = function (fpsValue) {
            fpsElement.textContent = 'FPS: ' + fpsValue;
        };

        step();
    })();
    
    
    
    //pop('./static/img/tz.jpg')
    
    
    
});




// ===== 搜索引擎 =====
(function() {
    var engineBtn = document.getElementById('searchEngine');
    var engineIcon = document.getElementById('searchEngineIcon');
    var engineName = document.getElementById('searchEngineName');
    var dropdown = document.getElementById('searchEngineDropdown');
    var options = dropdown.querySelectorAll('.searchEngineOption');
    var searchInput = document.getElementById('searchInput');
    var searchBtn = document.getElementById('searchBtn');

    // 默认选中 Bing（修改 HTML 中初始 active 类）
    var activeOption = dropdown.querySelector('.searchEngineOption[data-engine="bing"]');
    if (activeOption) {
        activeOption.classList.add('active');
        engineIcon.src = activeOption.dataset.icon;
        engineName.textContent = activeOption.dataset.engine === 'bilibili' ? 'Bilibili' : activeOption.textContent.trim();
    }

    // 点击引擎区域展开/收起下拉
    engineBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        engineBtn.classList.toggle('open');
    });

    // 选择引擎
    options.forEach(function(opt) {
        opt.addEventListener('click', function(e) {
            e.stopPropagation();
            // 移除所有 active
            options.forEach(function(o) { o.classList.remove('active'); });
            // 设置当前选中
            opt.classList.add('active');
            engineIcon.src = opt.dataset.icon;
            engineName.textContent = opt.dataset.engine === 'bilibili' ? 'Bilibili' : opt.textContent.trim();
            // 关闭下拉
            engineBtn.classList.remove('open');
        });
    });

    // 点击其他区域关闭下拉
    document.addEventListener('click', function() {
        engineBtn.classList.remove('open');
    });

    // 回车搜索
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            doSearch();
        }
    });

    // 点击搜索按钮
    searchBtn.addEventListener('click', function() {
        doSearch();
    });

    function doSearch() {
        var query = searchInput.value.trim();
        if (!query) return;
        var active = dropdown.querySelector('.searchEngineOption.active');
        var url = active ? active.dataset.url : 'https://www.bing.com/search?q=';
        window.open(url + encodeURIComponent(query), '_blank');
    }
})();

var pageLoading = document.querySelector("#mica-loading");
window.addEventListener('load', function() {
    setTimeout(function () {
        pageLoading.style.opacity = '0';
    }, 100);
});

// ===== 移动端侧边栏抽屉 =====
(function() {
    var toggleBtn = document.getElementById('sidebarToggle');
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');

    if (!toggleBtn || !sidebar || !overlay) return;

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('open');
        toggleBtn.setAttribute('aria-label', '关闭侧边栏');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        toggleBtn.setAttribute('aria-label', '打开侧边栏');
        document.body.style.overflow = '';
    }

    toggleBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (sidebar.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    overlay.addEventListener('click', function() {
        closeSidebar();
    });

    // 在侧边栏内点击链接后自动关闭
    sidebar.addEventListener('click', function(e) {
        if (e.target.closest('a')) {
            // 给一点延迟让链接跳转生效
            setTimeout(function() {
                closeSidebar();
            }, 150);
        }
    });

    // 手势滑动关闭（左滑）
    var touchStartX = 0;
    var touchStartY = 0;

    sidebar.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    sidebar.addEventListener('touchmove', function(e) {
        var deltaX = e.touches[0].clientX - touchStartX;
        var deltaY = e.touches[0].clientY - touchStartY;
        // 只有水平滑动大于垂直滑动，并且向左滑超过 60px 才关闭
        if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -60) {
            closeSidebar();
        }
    }, { passive: true });
})();

