(function () {
  'use strict';

  // ===== MetingJS 配置 =====
  // 网易云歌单 ID (可在 URL 中获取，例如 https://music.163.com/#/playlist?id=7551548790)
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
  // 5 行歌词行: prev2, prev1, current, next1, next2
  var lyricLines = [];

  // ===== 状态 =====
  var playlist = [];
  var currentIndex = 0;
  var audio = null;
  var isPlaying = false;
  var isDragging = false;

  // ===== 初始化 =====
  function init() {
    if (!coverWrap) return;
    fetchPlaylist();
  }

  // ===== 获取歌单 =====
  function fetchPlaylist() {
    fetch(METING_API)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) {
          playlist = data.map(function (item) {
            // 从 url 中提取歌曲 id
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

  // ===== 从 url 中提取歌曲 id =====
  function extractTrackId(url, item) {
    // 尝试从 url 中匹配 id=数字 的格式 (如 music.163.com/song/media/outer/url?id=XXXXX)
    var match = url && url.match(/[?&]id=(\d+)/);
    if (match) return match[1];
    // 回退: 使用 meting 返回的 id 字段
    if (item.id) return String(item.id);
    if (item.song_id) return String(item.song_id);
    return '';
  }

  // ===== 获取歌曲真实播放 url =====
  function fetchTrackUrl(trackId) {
    var apiUrl = 'https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=' + trackId + '&br=740';
    return fetch(apiUrl)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.url) {
          return data.url;
        }
        throw new Error('无法获取播放地址');
      });
  }

  // ===== 通过 API 获取歌词文本 =====
  function fetchLyric(trackId) {
    var apiUrl = 'https://music-api.gdstudio.xyz/api.php?types=lyric&source=netease&id=' + trackId;
    return fetch(apiUrl)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.lyric) {
          return data.lyric;
        }
        return '';
      })
      .catch(function () { return ''; });
  }

  // ===== 加载歌曲 =====
  function loadSong(index) {
    if (!playlist.length) return;
    var song = playlist[index];
    if (!song) return;

    // 停止当前
    if (audio) {
      audio.pause();
      audio = null;
    }

    // 更新 UI
    if (coverImg) coverImg.src = song.cover;
    if (titleEl) titleEl.textContent = song.title;
    if (artistEl) artistEl.textContent = song.artist;
    if (progressBar) progressBar.value = 0;
    if (curTimeEl) curTimeEl.textContent = '00:00';
    if (durTimeEl) durTimeEl.textContent = '00:00';
    // 重置歌词行: 中间行显示默认文字，其余清空
    clearLyricLines();
    if (lyricLines[2]) {
      lyricLines[2].textContent = '♪ 暂无歌词 ♪';
      lyricLines[2].className = lyricLines[2].className.replace(/\s*lrc-empty/g, '');
    }

    // 更新封面动画
    if (coverWrap) {
      coverWrap.classList.remove('playing', 'paused');
    }

    // 通过 API 获取真实播放地址
    if (!song.id) {
      // 没有 id，跳到下一首
      setTimeout(function () { nextSong(); }, 500);
      return;
    }

    // 歌词通过 API 获取
    Promise.all([fetchTrackUrl(song.id), fetchLyric(song.id)]).then(function (results) {
      var realUrl = results[0];
      var realLrc = results[1];
      // 更新歌曲对象中的歌词为真实文本
      song.lrc = realLrc;

      // 创建 audio 使用真实 url
      audio = new Audio(realUrl);
      audio.volume = 0.65;

      audio.addEventListener('loadedmetadata', function () {
        if (durTimeEl) durTimeEl.textContent = formatTime(audio.duration);
      });

      audio.addEventListener('timeupdate', function () {
        if (!isDragging && progressBar) {
          var pct = audio.duration ? (audio.currentTime / audio.duration) * 1000 : 0;
          progressBar.value = pct;
        }
        if (curTimeEl) curTimeEl.textContent = formatTime(audio.currentTime);

        // 歌词匹配（拖动期间暂停，避免重复请求）
        if (!isDragging) {
          updateLyric(audio.currentTime);
        }
      });

      audio.addEventListener('ended', function () {
        nextSong();
      });

      audio.addEventListener('error', function () {
        // 某些歌曲可能 URL 失效，跳到下一首
        setTimeout(function () { nextSong(); }, 500);
      });

      audio.addEventListener('canplay', function () {
        audio.play().then(function () {
          isPlaying = true;
          updatePlayState();
        }).catch(function () {
          // 自动播放被阻止
        });
      });

      // 加载音频
      audio.load();
    }).catch(function () {
      // API 获取失败，跳到下一首
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
      // 暂停时保留 playing 类（维持动画定义），同时添加 paused 类（暂停动画）
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
    // 拖动时立即同步歌词位置
    if (isDragging) {
      updateLyric(time);
    }
  }

  // ===== 歌词解析 =====
  // 存储解析后的歌词行
  var parsedLines = [];
  var lastIdx = -1;
  var lastLrcText = '';   // 缓存原始歌词文本，避免重复解析
  var fadeTimers = [];    // 渐隐渐显定时器

  function updateLyric(currentTime) {
    if (!lyricLines.length || !playlist[currentIndex]) return;
    var lrc = playlist[currentIndex].lrc || '';
    if (!lrc) {
      for (var i = 0; i < lyricLines.length; i++) {
        if (i !== 2 && lyricLines[i]) lyricLines[i].textContent = '';
      }
      if (lyricLines[2]) {
        lyricLines[2].textContent = '♪ 暂无歌词 ♪';
        lyricLines[2].className = lyricLines[2].className.replace(/\s*lrc-empty/g, '');
      }
      parsedLines = [];
      lastIdx = -1;
      lastLrcText = '';
      return;
    }
    // 歌词文本未变化则复用已解析结果（缓存）
    if (lrc !== lastLrcText) {
      parsedLines = parseLrc(lrc);
      lastLrcText = lrc;
    }
    if (!parsedLines.length) {
      for (var i = 0; i < lyricLines.length; i++) {
        if (i !== 2 && lyricLines[i]) lyricLines[i].textContent = '';
      }
      if (lyricLines[2]) {
        lyricLines[2].textContent = '♪ 暂无歌词 ♪';
        lyricLines[2].className = lyricLines[2].className.replace(/\s*lrc-empty/g, '');
      }
      lastIdx = -1;
      return;
    }

    // 找到当前时间对应的歌词索引
    var idx = 0;
    for (var i = 0; i < parsedLines.length; i++) {
      if (parsedLines[i].time <= currentTime) idx = i;
    }

    // 索引没变化则无需更新
    if (idx === lastIdx) return;
    lastIdx = idx;

    // 清除之前的渐隐定时器
    for (var t = 0; t < fadeTimers.length; t++) {
      clearTimeout(fadeTimers[t]);
    }
    fadeTimers = [];

    // 先将所有行设为渐隐（lrc-empty 状态）
    for (var s = 0; s < lyricLines.length; s++) {
      if (lyricLines[s]) {
        lyricLines[s].className = lyricLines[s].className.replace(/\s*lrc-empty/g, '') + ' lrc-empty';
      }
    }

    // 延迟后更新文字并渐显
    fadeTimers.push(setTimeout(function () {
      setLyricLineText(0, idx - 2); // prev2
      setLyricLineText(1, idx - 1); // prev1
      setLyricLineText(2, idx);     // current
      setLyricLineText(3, idx + 1); // next1
      setLyricLineText(4, idx + 2); // next2
    }, 200));
  }

  function setLyricLineText(slot, lineIdx) {
    var el = lyricLines[slot];
    if (!el) return;
    if (lineIdx >= 0 && lineIdx < parsedLines.length) {
      el.textContent = parsedLines[lineIdx].text || '';
      el.className = el.className.replace(/\s*lrc-empty/g, '');
    } else {
      el.textContent = '';
      // lrc-empty 已在统一渐隐时设置，无需再追加
    }
  }

  function clearLyricLines() {
    for (var i = 0; i < fadeTimers.length; i++) {
      clearTimeout(fadeTimers[i]);
    }
    fadeTimers = [];
    for (var i = 0; i < lyricLines.length; i++) {
      if (lyricLines[i]) lyricLines[i].textContent = '';
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
  function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }

  // ===== 获取歌词行 DOM =====
  var lyricsContainer = document.getElementById('musicLyrics');
  if (lyricsContainer) {
    lyricLines = [
      lyricsContainer.querySelector('.lrc-prev2'),
      lyricsContainer.querySelector('.lrc-prev1'),
      lyricsContainer.querySelector('.lrc-current'),
      lyricsContainer.querySelector('.lrc-next1'),
      lyricsContainer.querySelector('.lrc-next2')
    ];
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