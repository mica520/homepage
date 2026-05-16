(function () {
  'use strict';

  // ===== MetingJS 配置 =====
  var PLAYLIST_ID = '13115764922';
  var METING_API = 'https://meting.jinghuashang.cn/?type=playlist&id=' + PLAYLIST_ID + '&server=netease';

  // ===== DOM =====
  var coverWrap = document.getElementById('musicCoverWrap');
  var coverImg = document.getElementById('musicCover');
  var titleEl = document.getElementById('musicTitle');
  var artistEl = document.getElementById('musicArtist');
  var playBtn = document.getElementById('musicPlay');
  var prevBtn = document.getElementById('musicPrev');
  var nextBtn = document.getElementById('musicNext');
  var progressBar = document.getElementById('musicProgress');
  var curTimeEl = document.getElementById('musicCurTime');
  var durTimeEl = document.getElementById('musicDurTime');
  var lrcStage = document.getElementById('lrcStage');
  var lrcLines = [null, null, null];

  // ===== 状态 =====
  var playlist = [];
  var currentIndex = 0;
  var audio = null;
  var isPlaying = false;
  var isDragging = false;
  var loadToken = 0;

  // ===== 初始化 =====
  function init() {
    if (!coverWrap) return;
    if (lrcStage) {
      lrcLines[0] = lrcStage.querySelector('.lrc-line-0');
      lrcLines[1] = lrcStage.querySelector('.lrc-line-1');
      lrcLines[2] = lrcStage.querySelector('.lrc-line-2');
    }
    fetchPlaylist();
  }

  // ===== 获取歌单 =====
  function fetchPlaylist() {
    fetch(METING_API)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) {
          playlist = data.map(function (item) {
            var trackId = extractTrackId(item.url, item);
            return {
              title: item.name || item.title || '未知歌曲',
              artist: item.artist || item.author || '未知艺术家',
              cover: item.pic || item.picture || item.cover || '',
              id: trackId,
              lrc: item.lrc || item.lyric || '',
            };
          });
          currentIndex = getRandomIndex(-1);
          loadSong(currentIndex);
        }
      })
      .catch(function () {
        setInfo('加载歌单失败', '请检查网络', '');
      });
  }

  function extractTrackId(url, item) {
    var match = url && url.match(/[?&]id=(\d+)/);
    if (match) return match[1];
    if (item.id) return String(item.id);
    if (item.song_id) return String(item.song_id);
    return '';
  }

  function fetchTrackUrl(trackId) {
    var apiUrl = 'https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=' + trackId + '&br=740';
    return fetch(apiUrl)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.url) return data.url;
        throw new Error('无法获取播放地址');
      });
  }

  function fetchLyric(trackId) {
    var apiUrl = 'https://music-api.gdstudio.xyz/api.php?types=lyric&source=netease&id=' + trackId;
    return fetch(apiUrl)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.lyric) return data.lyric;
        return '';
      })
      .catch(function () { return ''; });
  }

  // ===== 加载歌曲 =====
  function loadSong(index) {
    if (!playlist.length) return;
    var song = playlist[index];
    if (!song) return;

    loadToken += 1;
    var currentLoadToken = loadToken;
    isPlaying = false;
    updatePlayState();

    if (audio) {
      audio.pause();
      audio = null;
    }

    if (coverImg) coverImg.src = song.cover;
    if (titleEl) titleEl.textContent = song.title;
    if (artistEl) artistEl.textContent = song.artist;
    if (progressBar) progressBar.value = 0;
    if (curTimeEl) curTimeEl.textContent = '00:00';
    if (durTimeEl) durTimeEl.textContent = '00:00';
    clearLyricLines();
    showNoLyric();

    if (coverWrap) {
      coverWrap.classList.remove('playing', 'paused');
    }

    if (!song.id) {
      setTimeout(function () { nextSong(); }, 500);
      return;
    }

    Promise.all([fetchTrackUrl(song.id), fetchLyric(song.id)]).then(function (results) {
      if (currentLoadToken !== loadToken) return;
      var realUrl = results[0];
      var realLrc = results[1];
      song.lrc = realLrc;

      var currentAudio = new Audio(realUrl);
      currentAudio.volume = 0.65;
      audio = currentAudio;

      var isCurrent = function () {
        return audio === currentAudio && currentLoadToken === loadToken;
      };

      currentAudio.addEventListener('loadedmetadata', function () {
        if (!isCurrent()) return;
        if (durTimeEl) durTimeEl.textContent = formatTime(currentAudio.duration);
      });

      currentAudio.addEventListener('timeupdate', function () {
        if (!isCurrent()) return;
        if (!isDragging && progressBar) {
          var pct = currentAudio.duration ? (currentAudio.currentTime / currentAudio.duration) * 1000 : 0;
          progressBar.value = pct;
        }
        if (curTimeEl) curTimeEl.textContent = formatTime(currentAudio.currentTime);
        if (!isDragging) {
          updateLyric(currentAudio.currentTime);
        }
      });

      currentAudio.addEventListener('ended', function () {
        if (!isCurrent()) return;
        nextSong();
      });

      currentAudio.addEventListener('error', function () {
        if (!isCurrent()) return;
        setTimeout(function () { nextSong(); }, 500);
      });

      currentAudio.addEventListener('canplay', function () {
        if (!isCurrent()) return;
        currentAudio.play().then(function () {
          if (!isCurrent()) return;
          isPlaying = true;
          updatePlayState();
        }).catch(function () {});
      });

      currentAudio.load();
    }).catch(function () {
      if (currentLoadToken !== loadToken) return;
      setTimeout(function () { nextSong(); }, 500);
    });
  }

  // ===== 播放/暂停 =====
  function togglePlay() {
    if (!audio) {
      if (playlist.length) loadSong(currentIndex);
      return;
    }
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
      updatePlayState();
    } else {
      audio.play().then(function () {
        isPlaying = true;
        updatePlayState();
      }).catch(function () {});
    }
  }

  function updatePlayState() {
    if (!coverWrap || !playBtn) return;
    var playSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    var pauseSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    playBtn.innerHTML = isPlaying ? pauseSvg : playSvg;

    if (isPlaying) {
      coverWrap.classList.add('playing');
      coverWrap.classList.remove('paused');
    } else {
      coverWrap.classList.add('playing', 'paused');
    }
  }

  // ===== 上下曲 =====
  function prevSong() {
    if (!playlist.length) return;
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    loadSong(currentIndex);
  }

  function getRandomIndex(excludeIndex) {
    if (playlist.length === 1) return 0;
    var idx;
    do {
      idx = Math.floor(Math.random() * playlist.length);
    } while (idx === excludeIndex);
    return idx;
  }

  function nextSong() {
    if (!playlist.length) return;
    currentIndex = getRandomIndex(currentIndex);
    loadSong(currentIndex);
  }

  // ===== 进度条 =====
  function seekTo(value) {
    if (!audio || !audio.duration) return;
    var time = (value / 1000) * audio.duration;
    audio.currentTime = time;
    if (isDragging) {
      updateLyric(time);
    }
  }

  // ===== 歌词解析 =====
  var parsedLines = [];
  var lastIdx = -1;
  var lastLrcText = '';
  var scrollTimer = null;
  var fadeTimer = null;

  var LINE_HEIGHT = 21;

  function updateLyric(currentTime) {
    if (!lrcStage || !lrcLines[0] || !playlist[currentIndex]) return;
    var lrc = playlist[currentIndex].lrc || '';
    if (!lrc) {
      showNoLyric();
      parsedLines = [];
      lastIdx = -1;
      lastLrcText = '';
      return;
    }
    if (lrc !== lastLrcText) {
      parsedLines = parseLrc(lrc);
      lastLrcText = lrc;
    }
    if (!parsedLines.length) {
      showNoLyric();
      lastIdx = -1;
      return;
    }

    var idx = 0;
    for (var i = 0; i < parsedLines.length; i++) {
      if (parsedLines[i].time <= currentTime) idx = i;
    }

    if (idx === lastIdx) return;

    var direction = 0;
    if (lastIdx >= 0) {
      direction = idx > lastIdx ? 1 : -1;
    }
    lastIdx = idx;

    var prevText = idx > 0 ? parsedLines[idx - 1].text : '';
    var currText = parsedLines[idx].text || '';
    var nextText = idx + 1 < parsedLines.length ? parsedLines[idx + 1].text : '';

    setThreeLines(prevText, currText, nextText, direction);
  }

  // direction: 1=前进, -1=后退, 0=无动画(初始)
  function setThreeLines(prevText, currText, nextText, direction) {
    if (!lrcStage || !lrcLines[0]) return;

    // 清除之前的定时器
    if (scrollTimer) {
      clearTimeout(scrollTimer);
      scrollTimer = null;
    }
    if (fadeTimer) {
      clearTimeout(fadeTimer);
      fadeTimer = null;
    }

    // 确保中间行高亮类存在(用于后续淡入)
    var hadCurrent = lrcLines[1].classList.contains('lrc-current');

    if (direction === 0) {
      // 无动画：直接设置文字
      lrcStage.style.transition = 'none';
      lrcStage.style.transform = 'translateY(0)';
      lrcLines[0].textContent = prevText;
      lrcLines[1].textContent = currText;
      lrcLines[2].textContent = nextText;
      lrcLines[0].classList.remove('lrc-current');
      lrcLines[2].classList.remove('lrc-current');
      lrcLines[1].classList.add('lrc-current');
      return;
    }

    // 第一步：淡出旧歌词 — 移除高亮，旧行逐渐变浅
    lrcLines[0].classList.remove('lrc-current');
    lrcLines[1].classList.remove('lrc-current');
    lrcLines[2].classList.remove('lrc-current');

    // 动画偏移量
    var offset = direction > 0 ? -LINE_HEIGHT : LINE_HEIGHT;

    // 延迟一帧触发滚动动画，让淡出先开始
    fadeTimer = setTimeout(function () {
      if (!lrcStage || !lrcLines[0]) return;

      // 第二步：滚动 + 滚动完成后更新文字并淡入新歌词
      lrcStage.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      lrcStage.style.transform = 'translateY(' + offset + 'px)';

      scrollTimer = setTimeout(function () {
        if (!lrcStage || !lrcLines[0]) return;
        lrcStage.style.transition = 'none';
        lrcStage.style.transform = 'translateY(0)';
        lrcLines[0].textContent = prevText;
        lrcLines[1].textContent = currText;
        lrcLines[2].textContent = nextText;
        // 淡入新歌词 — 加回高亮，颜色逐渐变深
        lrcLines[1].classList.add('lrc-current');
        lrcLines[0].classList.remove('lrc-current');
        lrcLines[2].classList.remove('lrc-current');
        scrollTimer = null;
      }, 400);
    }, 100);
  }

  // 显示"暂无歌词"
  function showNoLyric() {
    if (!lrcStage || !lrcLines[1]) return;
    if (scrollTimer) {
      clearTimeout(scrollTimer);
      scrollTimer = null;
    }
    if (fadeTimer) {
      clearTimeout(fadeTimer);
      fadeTimer = null;
    }
    lrcStage.style.transition = 'none';
    lrcStage.style.transform = 'translateY(0)';
    lrcLines[0].textContent = '';
    lrcLines[1].textContent = '♪ 暂无歌词 ♪';
    lrcLines[1].classList.add('lrc-current');
    lrcLines[1].classList.remove('lrc-empty');
    lrcLines[2].textContent = '';
    lrcLines[0].classList.remove('lrc-current');
    lrcLines[2].classList.remove('lrc-current');
  }

  function clearLyricLines() {
    if (scrollTimer) {
      clearTimeout(scrollTimer);
      scrollTimer = null;
    }
    if (fadeTimer) {
      clearTimeout(fadeTimer);
      fadeTimer = null;
    }
    if (lrcStage) {
      lrcStage.style.transition = 'none';
      lrcStage.style.transform = 'translateY(0)';
    }
    if (lrcLines[0]) {
      lrcLines[0].textContent = '';
      lrcLines[0].classList.remove('lrc-current');
    }
    if (lrcLines[1]) {
      lrcLines[1].textContent = '';
      lrcLines[1].classList.remove('lrc-current');
    }
    if (lrcLines[2]) {
      lrcLines[2].textContent = '';
      lrcLines[2].classList.remove('lrc-current');
    }
    parsedLines = [];
    lastIdx = -1;
    lastLrcText = '';
  }

  function parseLrc(lrc) {
    var lines = lrc.split('\n');
    var result = [];
    var timeReg = /\[(\d{2}):(\d{2}(?:\.\d+)?)\]/g;
    lines.forEach(function (line) {
      var match;
      var text = line.replace(timeReg, '').trim();
      while ((match = timeReg.exec(line)) !== null) {
        var mins = parseInt(match[1], 10);
        var secs = parseFloat(match[2]);
        result.push({ time: mins * 60 + secs, text: text });
      }
    });
    result.sort(function (a, b) { return a.time - b.time; });
    return result;
  }

  // ===== 工具 =====
  function setInfo(title, artist) {
    if (titleEl) titleEl.textContent = title;
    if (artistEl) artistEl.textContent = artist;
  }

  function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }

  // ===== 事件绑定 =====
  if (coverWrap) coverWrap.addEventListener('click', togglePlay);
  if (playBtn) playBtn.addEventListener('click', togglePlay);
  if (prevBtn) prevBtn.addEventListener('click', prevSong);
  if (nextBtn) nextBtn.addEventListener('click', nextSong);

  if (progressBar) {
    progressBar.setAttribute('min', '0');
    progressBar.setAttribute('max', '1000');
    progressBar.setAttribute('step', '1');
    progressBar.value = 0;

    progressBar.addEventListener('mousedown', function () { isDragging = true; });
    progressBar.addEventListener('touchstart', function () { isDragging = true; });
    progressBar.addEventListener('input', function () {
      seekTo(progressBar.value);
    });
    document.addEventListener('mouseup', function () {
      if (isDragging) isDragging = false;
    });
    document.addEventListener('touchend', function () {
      if (isDragging) isDragging = false;
    });
  }

  // ===== 启动 =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();