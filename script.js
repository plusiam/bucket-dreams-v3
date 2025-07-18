/**
 * Bucket Dreams - 완전히 리팩토링된 버전
 * 모든 기존 기능을 포함한 모듈화된 구조
 */

(function() {
    'use strict';

    // ========================================
    // 1. 설정 및 상수 (Configuration)
    // ========================================
    const CONFIG = {
        STORAGE_KEY: 'bucketListProfiles',
        AUTO_LOGOUT_TIME: 30 * 60 * 1000, // 30분
        MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
        IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        CATEGORIES: {
            travel: { name: '여행', icon: '🌍' },
            hobby: { name: '취미', icon: '🎨' },
            career: { name: '커리어', icon: '💼' },
            relationship: { name: '인간관계', icon: '👥' },
            health: { name: '건강', icon: '💪' },
            other: { name: '기타', icon: '✨' }
        },
        EMOTIONS: {
            excited: { name: '설렘', emoji: '😍' },
            proud: { name: '뿌듯함', emoji: '😎' },
            happy: { name: '행복', emoji: '😊' },
            satisfied: { name: '만족', emoji: '😌' },
            grateful: { name: '감사', emoji: '🙏' },
            motivated: { name: '신남', emoji: '🤩' },
            anxious: { name: '불안', emoji: '😰' },
            determined: { name: '결단력', emoji: '💪' },
            overwhelmed: { name: '압도됨', emoji: '😵' }
        },
        DEFAULT_IMAGE_SETTINGS: {
            quality: 0.8,
            maxWidth: 1200,
            format: 'jpeg',
            autoCompress: true
        }
    };

    // ========================================
    // 2. 유틸리티 함수 (Utilities)
    // ========================================
    const Utils = {
        // ID 생성
        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        },

        // 날짜 포맷
        formatDate(date) {
            if (!date) return '';
            const d = new Date(date);
            return d.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },
        
        // 짧은 날짜 포맷 (MM/DD)
        formatShortDate(date) {
            if (!date) return '';
            const d = new Date(date);
            return `${d.getMonth() + 1}/${d.getDate()}`;
        },

        // 상대 시간 계산
        getRelativeTime(date) {
            const now = new Date();
            const past = new Date(date);
            const diff = now - past;
            
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            
            if (minutes < 60) return `${minutes}분 전`;
            if (hours < 24) return `${hours}시간 전`;
            if (days < 30) return `${days}일 전`;
            if (days < 365) return `${Math.floor(days / 30)}개월 전`;
            return `${Math.floor(days / 365)}년 전`;
        },

        // HTML 이스케이프
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        // 디바운스
        debounce(func, wait, immediate = false) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    timeout = null;
                    if (!immediate) func(...args);
                };
                const callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func(...args);
            };
        },

        // 쓰로틀
        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        // 딥 클론
        deepClone(obj) {
            return JSON.parse(JSON.stringify(obj));
        },

        // 퍼센트 계산
        calculatePercentage(completed, total) {
            if (total === 0) return 0;
            return Math.round((completed / total) * 100);
        },

        // 모바일 감지
        isMobile() {
            return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        },

        // 랜덤 선택
        getRandomItem(array) {
            return array[Math.floor(Math.random() * array.length)];
        }
    };

    // ========================================
    // 3. 스토리지 관리 (Storage Manager)
    // ========================================
    const Storage = {
        // localStorage 안전 사용
        get(key) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (e) {
                console.error('Storage get error:', e);
                // 쿠키 폴백
                const cookieData = this.getCookie(key);
                return cookieData ? JSON.parse(cookieData) : null;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Storage set error:', e);
                // 쿠키 폴백
                this.setCookie(key, JSON.stringify(value));
                return false;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.error('Storage remove error:', e);
            }
        },

        // 쿠키 헬퍼
        setCookie(name, value, days = 30) {
            const expires = new Date(Date.now() + days * 864e5).toUTCString();
            document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
        },

        getCookie(name) {
            return document.cookie.split('; ').reduce((r, v) => {
                const parts = v.split('=');
                return parts[0] === name ? decodeURIComponent(parts[1]) : r;
            }, '');
        },

        // 용량 체크
        getStorageSize() {
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length + key.length;
                }
            }
            return (totalSize / 1024 / 1024).toFixed(2); // MB
        }
    };

    // ========================================
    // 4. 이미지 처리 (Image Processor)
    // ========================================
    const ImageProcessor = {
        // 이미지 설정
        settings: { ...CONFIG.DEFAULT_IMAGE_SETTINGS },

        // 이미지 유효성 검사
        validateImage(file) {
            if (!CONFIG.IMAGE_TYPES.includes(file.type)) {
                throw new Error('JPG, PNG, WebP 파일만 업로드 가능합니다.');
            }
            
            if (file.size > CONFIG.MAX_IMAGE_SIZE) {
                throw new Error('파일 크기는 10MB 이하만 가능합니다.');
            }

            // 파일 이름 보안 검증
            const fileName = file.name.toLowerCase();
            const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
            if (dangerousExtensions.some(ext => fileName.includes(ext))) {
                throw new Error('허용되지 않는 파일 형식입니다.');
            }
            
            return true;
        },

        // 이미지 압축
        async compressImage(file, options = {}) {
            const settings = { ...this.settings, ...options };
            
            // 자동 압축이 비활성화된 경우 원본 반환
            if (!settings.autoCompress) {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            }
            
            return new Promise((resolve, reject) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = function() {
                    // 비율 계산
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > settings.maxWidth) {
                        height = (settings.maxWidth / width) * height;
                        width = settings.maxWidth;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // 이미지 그리기
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // 압축된 데이터 URL 반환
                    canvas.toBlob((blob) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    }, `image/${settings.format}`, settings.quality);
                };
                
                img.onerror = reject;
                
                // FileReader로 이미지 로드
                const reader = new FileReader();
                reader.onloadend = () => {
                    img.src = reader.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },

        // 이미지 크기 계산
        getImageSize(dataUrl) {
            const base64 = dataUrl.split(',')[1];
            const bytes = atob(base64).length;
            return (bytes / 1024 / 1024).toFixed(2); // MB
        },

        // 설정 업데이트
        updateSettings(newSettings) {
            this.settings = { ...this.settings, ...newSettings };
            Storage.set('imageSettings', this.settings);
        },

        // 설정 로드
        loadSettings() {
            const saved = Storage.get('imageSettings');
            if (saved) {
                this.settings = { ...this.settings, ...saved };
            }
        }
    };

    // ========================================
    // 5. 데이터 모델 (Data Model)
    // ========================================
    const DataModel = {
        // 상태
        state: {
            profiles: [],
            currentProfile: null,
            activeFilter: 'all',
            activeTab: 'goals',
            searchQuery: '',
            sortOrder: 'date-desc'
        },

        // 프로필 관리
        loadProfiles() {
            const data = Storage.get(CONFIG.STORAGE_KEY);
            
            // 데이터가 배열인지 확인
            if (Array.isArray(data)) {
                this.state.profiles = data;
            } else {
                this.state.profiles = [];
            }
            
            return this.state.profiles;
        },

        saveProfiles() {
            return Storage.set(CONFIG.STORAGE_KEY, this.state.profiles);
        },

        createProfile(name) {
            const profile = {
                id: Utils.generateId(),
                name: name.trim(),
                bucketList: [],
                createdAt: new Date().toISOString(),
                lastActive: new Date().toISOString(),
                settings: {
                    imageQuality: 0.8,
                    imageMaxWidth: 1200,
                    autoLogout: true
                },
                achievements: [],
                reflections: []
            };
            this.state.profiles.push(profile);
            this.saveProfiles();
            return profile;
        },

        setCurrentProfile(profile) {
            this.state.currentProfile = profile;
            if (profile) {
                profile.lastActive = new Date().toISOString();
                this.saveProfiles();
            }
        },

        deleteProfile(profileId) {
            this.state.profiles = this.state.profiles.filter(p => p.id !== profileId);
            if (this.state.currentProfile?.id === profileId) {
                this.state.currentProfile = null;
            }
            this.saveProfiles();
        },

        // 목표 관리
        addGoal(text, category) {
            if (!this.state.currentProfile) return null;

            const goal = {
                id: Utils.generateId(),
                text: text.trim(),
                category: category,
                completed: false,
                createdAt: new Date().toISOString(),
                completedAt: null,
                completionNote: null,
                completionEmotion: null,
                completionImage: null,
                emotionalJourney: [],
                tasks: [],
                taskProgress: 0,
                milestones: [],
                priority: 'medium',
                tags: [],
                reminders: []
            };

            this.state.currentProfile.bucketList.push(goal);
            this.saveProfiles();
            return goal;
        },

        updateGoal(goalId, updates) {
            if (!this.state.currentProfile) return null;

            const goal = this.state.currentProfile.bucketList.find(g => g.id === goalId);
            if (!goal) return null;

            Object.assign(goal, updates);
            
            // 태스크 진행률 재계산
            if (goal.tasks && goal.tasks.length > 0) {
                const completedTasks = goal.tasks.filter(t => t.completed).length;
                goal.taskProgress = Utils.calculatePercentage(completedTasks, goal.tasks.length);
            }

            this.saveProfiles();
            return goal;
        },

        deleteGoal(goalId) {
            if (!this.state.currentProfile) return;

            this.state.currentProfile.bucketList = 
                this.state.currentProfile.bucketList.filter(g => g.id !== goalId);
            this.saveProfiles();
        },

        completeGoal(goalId, completionData) {
            const updates = {
                completed: true,
                completedAt: completionData.date || new Date().toISOString(),
                completionNote: completionData.note,
                completionEmotion: completionData.emotion,
                completionImage: completionData.image
            };

            // 달성 기록 추가
            if (this.state.currentProfile) {
                this.state.currentProfile.achievements = this.state.currentProfile.achievements || [];
                this.state.currentProfile.achievements.push({
                    goalId: goalId,
                    date: updates.completedAt,
                    emotion: completionData.emotion
                });
            }

            return this.updateGoal(goalId, updates);
        },

        // 감정 여정
        addEmotionalEntry(goalId, emotion, motivation, energy, note = '') {
            const goal = this.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return null;

            const entry = {
                id: Utils.generateId(),
                date: new Date().toISOString(),
                emotion: emotion,
                motivation: motivation,
                energy: energy,
                note: note
            };

            goal.emotionalJourney = goal.emotionalJourney || [];
            goal.emotionalJourney.push(entry);
            this.saveProfiles();
            
            return entry;
        },

        // 태스크 관리
        addTask(goalId, taskData) {
            const goal = this.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return null;

            const task = {
                id: Utils.generateId(),
                text: taskData.text.trim(),
                completed: false,
                createdAt: new Date().toISOString(),
                completedAt: null,
                priority: taskData.priority || 'medium',
                estimatedTime: taskData.estimatedTime || null,
                actualTime: null,
                notes: taskData.notes || ''
            };

            goal.tasks = goal.tasks || [];
            goal.tasks.push(task);
            
            // 진행률 업데이트
            this.updateGoal(goalId, {});
            
            return task;
        },

        updateTask(goalId, taskId, updates) {
            const goal = this.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return null;

            const task = goal.tasks?.find(t => t.id === taskId);
            if (!task) return null;

            Object.assign(task, updates);
            
            if (updates.completed) {
                task.completedAt = new Date().toISOString();
            }

            // 진행률 업데이트
            this.updateGoal(goalId, {});
            
            return task;
        },

        deleteTask(goalId, taskId) {
            const goal = this.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal || !goal.tasks) return;

            goal.tasks = goal.tasks.filter(t => t.id !== taskId);
            
            // 진행률 업데이트
            this.updateGoal(goalId, {});
        },

        // 마일스톤 관리
        addMilestone(goalId, milestoneData) {
            const goal = this.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return null;

            const milestone = {
                id: Utils.generateId(),
                title: milestoneData.title,
                targetDate: milestoneData.targetDate,
                taskIds: milestoneData.taskIds || [],
                achieved: false,
                achievedDate: null
            };

            goal.milestones = goal.milestones || [];
            goal.milestones.push(milestone);
            this.saveProfiles();
            
            return milestone;
        },

        // 통계 계산
        getStats() {
            if (!this.state.currentProfile) {
                return { total: 0, completed: 0, percentage: 0, byCategory: {} };
            }

            const bucketList = this.state.currentProfile.bucketList || [];
            const total = bucketList.length;
            const completed = bucketList.filter(g => g.completed).length;
            const percentage = Utils.calculatePercentage(completed, total);

            // 카테고리별 통계
            const byCategory = {};
            Object.keys(CONFIG.CATEGORIES).forEach(cat => {
                const catGoals = bucketList.filter(g => g.category === cat);
                byCategory[cat] = {
                    total: catGoals.length,
                    completed: catGoals.filter(g => g.completed).length
                };
            });

            // 동기 지수 계산
            const motivationIndex = this.calculateMotivationIndex();

            return { total, completed, percentage, byCategory, motivationIndex };
        },

        // 동기 지수 계산
        calculateMotivationIndex() {
            if (!this.state.currentProfile) return 5.0;

            const bucketList = this.state.currentProfile.bucketList || [];
            const goalsWithEmotion = bucketList.filter(goal => 
                goal.emotionalJourney && goal.emotionalJourney.length > 0
            );

            if (goalsWithEmotion.length === 0) return 5.0;

            let totalMotivation = 0;
            let count = 0;

            goalsWithEmotion.forEach(goal => {
                const recentEntries = goal.emotionalJourney.slice(-3);
                recentEntries.forEach(entry => {
                    if (entry.motivation && !isNaN(entry.motivation)) {
                        totalMotivation += Number(entry.motivation);
                        count++;
                    }
                });
            });

            return count > 0 ? (totalMotivation / count).toFixed(1) : 5.0;
        },

        // 필터링 및 정렬
        getFilteredGoals(filter = 'all', searchQuery = '', sortOrder = 'date-desc') {
            if (!this.state.currentProfile) return [];

            let bucketList = this.state.currentProfile.bucketList || [];
            
            // 필터링
            if (filter !== 'all') {
                if (filter === 'completed') {
                    bucketList = bucketList.filter(g => g.completed);
                } else if (filter === 'active') {
                    bucketList = bucketList.filter(g => !g.completed);
                } else {
                    // 카테고리 필터
                    bucketList = bucketList.filter(g => g.category === filter);
                }
            }

            // 검색
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                bucketList = bucketList.filter(g => 
                    g.text.toLowerCase().includes(query) ||
                    (g.completionNote && g.completionNote.toLowerCase().includes(query))
                );
            }

            // 정렬
            bucketList.sort((a, b) => {
                switch (sortOrder) {
                    case 'date-desc':
                        return new Date(b.createdAt) - new Date(a.createdAt);
                    case 'date-asc':
                        return new Date(a.createdAt) - new Date(b.createdAt);
                    case 'category':
                        return a.category.localeCompare(b.category);
                    case 'completed':
                        return (b.completed ? 1 : 0) - (a.completed ? 1 : 0);
                    default:
                        return 0;
                }
            });

            return bucketList;
        },

        // 데이터 내보내기
        exportData(profileId = null) {
            if (profileId) {
                const profile = this.state.profiles.find(p => p.id === profileId);
                return profile ? JSON.stringify(profile, null, 2) : null;
            }
            return JSON.stringify(this.state.profiles, null, 2);
        },

        // 데이터 가져오기
        importData(jsonData) {
            try {
                const data = JSON.parse(jsonData);
                
                // 단일 프로필인 경우
                if (data.id && data.bucketList) {
                    const exists = this.state.profiles.find(p => p.id === data.id);
                    if (exists) {
                        if (confirm('같은 ID의 프로필이 이미 존재합니다. 덮어쓰시겠습니까?')) {
                            Object.assign(exists, data);
                        }
                    } else {
                        this.state.profiles.push(data);
                    }
                } 
                // 여러 프로필인 경우
                else if (Array.isArray(data)) {
                    if (confirm('모든 기존 데이터가 교체됩니다. 계속하시겠습니까?')) {
                        this.state.profiles = data;
                    }
                }
                
                this.saveProfiles();
                return true;
            } catch (e) {
                console.error('Import error:', e);
                return false;
            }
        }
    };

    // ========================================
    // 6. AI 추천 시스템 (AI Recommendation)
    // ========================================
    const AIRecommendation = {
        // 추천 데이터베이스
        recommendations: {
            travel: [
                "오로라 보기 (노르웨이, 핀란드)",
                "세계 7대 불가사의 방문하기",
                "트랜스시베리아 횡단 열차 타기",
                "산티아고 순례길 걷기",
                "발리에서 한 달 살기"
            ],
            hobby: [
                "나만의 유튜브 채널 만들기",
                "수제 맥주 만들기",
                "디지털 아트 배우기",
                "소설 한 편 완성하기",
                "텃밭 가꾸기"
            ],
            career: [
                "전문 자격증 취득하기",
                "TED 강연하기",
                "스타트업 창업하기",
                "멘토 되어 후배 도와주기",
                "업계 컨퍼런스에서 발표하기"
            ],
            relationship: [
                "가족과 함께 여행가기",
                "오래된 친구에게 편지 쓰기",
                "봉사활동 정기적으로 참여하기",
                "동창회 주최하기",
                "부모님 자서전 만들어드리기"
            ],
            health: [
                "마라톤 완주하기",
                "100일 운동 챌린지 완성하기",
                "명상 습관 만들기",
                "체중 목표 달성하기",
                "금연/금주 성공하기"
            ],
            other: [
                "나무 1000그루 심기",
                "특허 출원하기",
                "기부 문화 만들기",
                "타임캡슐 묻기",
                "자서전 쓰기"
            ]
        },

        // 개인화된 추천 생성
        getPersonalizedRecommendations(profile) {
            if (!profile || !profile.bucketList) return [];

            const recommendations = [];
            const existingGoals = profile.bucketList.map(g => g.text.toLowerCase());

            // 카테고리별 분석
            const categoryCount = {};
            profile.bucketList.forEach(goal => {
                categoryCount[goal.category] = (categoryCount[goal.category] || 0) + 1;
            });

            // 선호 카테고리 파악
            const preferredCategories = Object.entries(categoryCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([cat]) => cat);

            // 추천 생성
            preferredCategories.forEach(category => {
                const catRecommendations = this.recommendations[category] || [];
                const filtered = catRecommendations.filter(rec => 
                    !existingGoals.some(goal => goal.includes(rec.toLowerCase()))
                );
                
                if (filtered.length > 0) {
                    recommendations.push({
                        category: category,
                        text: Utils.getRandomItem(filtered),
                        reason: this.getRecommendationReason(category, profile)
                    });
                }
            });

            // 시즌별 추천 추가
            const seasonalRec = this.getSeasonalRecommendation();
            if (seasonalRec) {
                recommendations.push(seasonalRec);
            }

            return recommendations.slice(0, 3); // 최대 3개
        },

        // 추천 이유 생성
        getRecommendationReason(category, profile) {
            const completedInCategory = profile.bucketList
                .filter(g => g.category === category && g.completed).length;

            if (completedInCategory > 0) {
                return `${CONFIG.CATEGORIES[category].name} 분야에서 이미 ${completedInCategory}개를 달성하셨네요!`;
            }
            return `${CONFIG.CATEGORIES[category].name} 분야의 새로운 도전입니다.`;
        },

        // 시즌별 추천
        getSeasonalRecommendation() {
            const month = new Date().getMonth();
            const season = month >= 3 && month <= 5 ? 'spring' :
                         month >= 6 && month <= 8 ? 'summer' :
                         month >= 9 && month <= 11 ? 'fall' : 'winter';

            const seasonal = {
                spring: { text: "벚꽃 명소 여행가기", category: "travel" },
                summer: { text: "서핑 배우기", category: "hobby" },
                fall: { text: "단풍놀이 가기", category: "travel" },
                winter: { text: "스키/스노보드 배우기", category: "hobby" }
            };

            return {
                ...seasonal[season],
                reason: "이 계절에 딱 맞는 활동이에요! 🌸"
            };
        },

        // 동기부여 메시지
        getMotivationalMessage(goal) {
            const messages = {
                travel: [
                    "새로운 세상이 당신을 기다리고 있어요! ✈️",
                    "모든 여행은 자신을 발견하는 여정입니다 🌍",
                    "가장 좋은 시간은 바로 지금입니다 🎒"
                ],
                hobby: [
                    "새로운 취미는 삶을 더욱 풍요롭게 합니다 🎨",
                    "열정은 언제나 아름답습니다 ✨",
                    "시작이 반입니다. 도전해보세요! 🎯"
                ],
                career: [
                    "당신의 꿈은 충분히 가치있습니다 💼",
                    "성장하는 당신이 멋집니다 📈",
                    "한 걸음씩 나아가세요 🚀"
                ],
                relationship: [
                    "사랑하는 사람들과의 시간은 보물입니다 ❤️",
                    "관계는 삶의 가장 큰 선물입니다 🤝",
                    "함께하는 순간이 행복입니다 👨‍👩‍👧‍👦"
                ],
                health: [
                    "건강한 몸에 건강한 정신이 깃듭니다 💪",
                    "오늘의 운동이 내일의 활력입니다 🏃‍♂️",
                    "자신을 사랑하는 가장 좋은 방법입니다 ❤️"
                ],
                other: [
                    "당신만의 특별한 꿈을 응원합니다 🌟",
                    "불가능은 없습니다. 도전하세요! 💫",
                    "세상을 바꾸는 것은 작은 실천부터 시작됩니다 🌱"
                ]
            };

            const categoryMessages = messages[goal.category] || messages.other;
            return Utils.getRandomItem(categoryMessages);
        }
    };

    // ========================================
    // 7. PDF 생성기 (PDF Generator)
    // ========================================
    const PDFGenerator = {
        // PDF 생성
        async generatePDF(goals, profileName) {
            if (typeof jspdf === 'undefined') {
                throw new Error('PDF 라이브러리가 로드되지 않았습니다.');
            }

            const { jsPDF } = jspdf;
            const doc = new jsPDF();

            // 한글 폰트 설정 (Base64 인코딩된 폰트 필요)
            // 실제 구현시 한글 폰트 추가 필요

            // 제목
            doc.setFontSize(20);
            doc.text(`${profileName}님의 버킷리스트`, 105, 20, { align: 'center' });

            // 날짜
            doc.setFontSize(10);
            doc.text(`생성일: ${Utils.formatDate(new Date())}`, 105, 30, { align: 'center' });

            // 통계
            const completed = goals.filter(g => g.completed).length;
            const total = goals.length;
            const percentage = Utils.calculatePercentage(completed, total);

            doc.setFontSize(12);
            doc.text(`총 ${total}개 목표 중 ${completed}개 완료 (${percentage}%)`, 20, 45);

            // 목표 리스트
            let yPosition = 60;
            goals.forEach((goal, index) => {
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                }

                const status = goal.completed ? '[완료]' : '[진행중]';
                const category = CONFIG.CATEGORIES[goal.category]?.name || '기타';
                
                doc.setFontSize(10);
                doc.text(`${index + 1}. ${status} ${goal.text} (${category})`, 20, yPosition);
                
                if (goal.completed && goal.completionNote) {
                    doc.setFontSize(8);
                    doc.text(`   완료일: ${Utils.formatDate(goal.completedAt)}`, 25, yPosition + 5);
                    doc.text(`   소감: ${goal.completionNote}`, 25, yPosition + 10);
                    yPosition += 15;
                } else {
                    yPosition += 10;
                }
            });

            return doc;
        },

        // 달성 카드 생성
        async generateAchievementCard(goal, profileName) {
            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas 라이브러리가 로드되지 않았습니다.');
            }

            // 카드 HTML 생성
            const cardHtml = `
                <div class="achievement-card-export" style="width: 600px; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-family: Arial, sans-serif;">
                    <h2 style="font-size: 28px; margin-bottom: 20px;">🎉 목표 달성!</h2>
                    <p style="font-size: 20px; margin-bottom: 10px;">${Utils.escapeHtml(goal.text)}</p>
                    <p style="font-size: 16px; opacity: 0.9;">달성일: ${Utils.formatDate(goal.completedAt)}</p>
                    ${goal.completionNote ? `<p style="font-size: 14px; margin-top: 20px; font-style: italic;">"${Utils.escapeHtml(goal.completionNote)}"</p>` : ''}
                    <p style="font-size: 14px; margin-top: 30px; opacity: 0.8;">- ${Utils.escapeHtml(profileName)} -</p>
                </div>
            `;

            // 임시 컨테이너 생성
            const container = document.createElement('div');
            container.innerHTML = cardHtml;
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            document.body.appendChild(container);

            try {
                const canvas = await html2canvas(container.firstElementChild);
                const dataUrl = canvas.toDataURL('image/png');
                return dataUrl;
            } finally {
                document.body.removeChild(container);
            }
        }
    };

    // ========================================
    // 8. 차트 관리자 (Chart Manager)
    // ========================================
    const ChartManager = {
        charts: {},

        // 차트 초기화
        initCharts() {
            if (typeof Chart === 'undefined') {
                console.warn('Chart.js가 로드되지 않았습니다.');
                return;
            }

            // 기본 설정
            Chart.defaults.font.family = "'Noto Sans KR', sans-serif";
            Chart.defaults.color = '#333';
        },

        // 달성률 차트
        createAchievementChart(canvasId, stats) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            
            // 기존 차트 제거
            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }

            this.charts[canvasId] = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['완료', '진행중'],
                    datasets: [{
                        data: [stats.completed, stats.total - stats.completed],
                        backgroundColor: ['#4facfe', '#e0e0e0'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${value}개 (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        },

        // 카테고리 분포 차트
        createCategoryChart(canvasId, categoryStats) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            
            // 기존 차트 제거
            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }

            const categories = Object.keys(categoryStats);
            const data = categories.map(cat => categoryStats[cat].total);
            const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

            this.charts[canvasId] = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: categories.map(cat => CONFIG.CATEGORIES[cat]?.name || cat),
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        },

        // 감정 패턴 차트
        createEmotionChart(canvasId, emotionData) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            
            // 기존 차트 제거
            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }

            this.charts[canvasId] = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: Object.values(CONFIG.EMOTIONS).map(e => e.name),
                    datasets: [{
                        label: '감정 빈도',
                        data: emotionData,
                        backgroundColor: 'rgba(79, 172, 254, 0.2)',
                        borderColor: 'rgba(79, 172, 254, 1)',
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(79, 172, 254, 1)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(79, 172, 254, 1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 10,
                            ticks: { display: false },
                            grid: { color: 'rgba(0, 0, 0, 0.1)' }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        },

        // 시간 패턴 차트
        createTimePatternChart(canvasId, timeData) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            
            // 기존 차트 제거
            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }

            this.charts[canvasId] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: timeData.labels,
                    datasets: [{
                        label: '월별 달성 목표',
                        data: timeData.values,
                        borderColor: '#4facfe',
                        backgroundColor: 'rgba(79, 172, 254, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        },

        // 모든 차트 제거
        destroyAllCharts() {
            Object.values(this.charts).forEach(chart => {
                if (chart) chart.destroy();
            });
            this.charts = {};
        }
    };

    // ========================================
    // 9. 뷰 렌더링 (View Rendering)
    // ========================================
    const View = {
        // DOM 요소 캐시
        elements: {},

        // DOM 요소 초기화
        initElements() {
            this.elements = {
                // 프로필 관련
                profileSelector: document.getElementById('profileSelector'),
                currentUserName: document.getElementById('currentUserName'),
                
                // 탭 관련
                tabButtons: document.querySelectorAll('.nav-tab'),
                tabContents: document.querySelectorAll('.tab-content'),
                
                // 목표 관련
                goalInput: document.getElementById('goalInput'),
                categorySelect: document.getElementById('categorySelect'),
                bucketList: document.getElementById('bucketList'),
                filterButtons: document.querySelectorAll('.filter-btn'),
                
                // 통계
                totalCount: document.getElementById('totalCount'),
                completedCount: document.getElementById('completedCount'),
                progressPercent: document.getElementById('progressPercent'),
                motivationIndex: document.getElementById('motivationIndex'),
                
                // 검색
                searchInput: document.getElementById('searchInput'),
                
                // 정렬
                sortSelect: document.getElementById('sortSelect'),
                
                // 모달
                modals: document.querySelectorAll('.modal'),
                
                // 추천
                recommendationCards: document.getElementById('recommendationCards'),
                
                // 갤러리
                galleryGrid: document.getElementById('galleryGrid'),
                
                // 여정
                achievementTimeline: document.getElementById('achievementTimeline'),
                categoryProgressGrid: document.getElementById('categoryProgressGrid'),
                
                // 인사이트
                achievementChart: document.getElementById('achievementChart'),
                emotionChart: document.getElementById('emotionChart'),
                timePatternChart: document.getElementById('timePatternChart'),
                categoryDistributionChart: document.getElementById('categoryDistributionChart')
            };
        },

        // 프로필 선택자 렌더링
        renderProfileSelector(profiles = []) {
            const container = document.getElementById('profileOptions');
            if (!container) return;

            // 프로필이 없어도 버튼은 표시
            container.innerHTML = profiles.map(profile => {
                const stats = this.calculateProfileStats(profile);
                return `
                    <div class="profile-card" data-profile-id="${profile.id}">
                        <div class="profile-name">${Utils.escapeHtml(profile.name)}</div>
                        <div class="profile-stats">
                            ${stats.total} 목표 · ${stats.completed} 완료
                        </div>
                        <div class="profile-last-active">
                            ${Utils.getRelativeTime(profile.lastActive)}
                        </div>
                    </div>
                `;
            }).join('');

            // 새 프로필 추가 버튼
            container.innerHTML += `
                <div class="profile-card add-profile" id="addProfileBtn">
                    <div class="profile-icon">➕</div>
                    <div class="profile-name">새 사용자</div>
                </div>
            `;

            // 게스트 모드 버튼
            container.innerHTML += `
                <div class="profile-card guest-profile" id="guestModeBtn">
                    <div class="profile-icon">👤</div>
                    <div class="profile-name">게스트 모드</div>
                    <div class="profile-note">데이터가 저장되지 않습니다</div>
                </div>
            `;
        },

        // 프로필 통계 계산
        calculateProfileStats(profile) {
            const bucketList = profile.bucketList || [];
            return {
                total: bucketList.length,
                completed: bucketList.filter(g => g.completed).length
            };
        },

        // 통계 업데이트
        updateStats(stats) {
            if (this.elements.totalCount) {
                this.elements.totalCount.textContent = stats.total;
            }
            if (this.elements.completedCount) {
                this.elements.completedCount.textContent = stats.completed;
            }
            if (this.elements.progressPercent) {
                this.elements.progressPercent.textContent = stats.percentage + '%';
            }
            if (this.elements.motivationIndex) {
                this.elements.motivationIndex.textContent = stats.motivationIndex || '5.0';
            }
        },

        // 버킷리스트 렌더링
        renderBucketList(goals) {
            const container = this.elements.bucketList;
            if (!container) return;

            if (goals.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>아직 목표가 없습니다</h3>
                        <p>첫 번째 버킷리스트를 추가해보세요!</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = goals.map(goal => this.createGoalElement(goal)).join('');
            
            // 애니메이션 효과
            container.querySelectorAll('.goal-item').forEach((item, index) => {
                item.style.animationDelay = `${index * 0.05}s`;
                item.classList.add('fade-in');
            });
        },

        // 목표 요소 생성
        createGoalElement(goal) {
            const categoryInfo = CONFIG.CATEGORIES[goal.category] || CONFIG.CATEGORIES.other;
            const isCompleted = goal.completed;
            const hasImage = goal.completionImage;
            const hasTasks = goal.tasks && goal.tasks.length > 0;
            const hasEmotionalJourney = goal.emotionalJourney && goal.emotionalJourney.length > 0;
            
            // 태스크 정보 가져오기
            const tasks = goal.tasks || [];
            const completedTasks = tasks.filter(t => t.completed).length;
            const totalTasks = tasks.length;
            const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            // 초기 감정 가져오기
            const initialEmotion = goal.emotionalJourney && goal.emotionalJourney.length > 0 
                ? goal.emotionalJourney[0].emotion 
                : null;

            return `
                <article class="goal-card ${isCompleted ? 'completed' : ''}" 
                         data-id="${goal.id}" 
                         data-category="${goal.category}">
                    <div class="category-bar ${goal.category}"></div>
                    
                    <div class="goal-header">
                        <div>
                            <h3 class="goal-title">${Utils.escapeHtml(goal.text)}</h3>
                            <div class="goal-metadata">
                                <span class="goal-category-badge">${categoryInfo.icon} ${categoryInfo.name}</span>
                                ${initialEmotion ? `
                                    <span class="goal-emotion" title="초기 감정">
                                        ${CONFIG.EMOTIONS[initialEmotion]?.emoji || '😊'}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    ${hasTasks || !isCompleted ? `
                        <div class="tasks-section">
                            <div class="tasks-header">
                                <span class="tasks-title">세부 태스크 ${hasTasks ? `(${completedTasks}/${totalTasks})` : ''}</span>
                                <button class="btn-add-task btn-task" data-goal-id="${goal.id}">+ 태스크 추가</button>
                            </div>
                            
                            ${hasTasks ? `
                                <div class="task-list">
                                    ${tasks.map(task => `
                                        <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                                            <div class="task-item-header">
                                                <input type="checkbox" 
                                                       class="task-checkbox" 
                                                       data-goal-id="${goal.id}" 
                                                       data-task-id="${task.id}"
                                                       ${task.completed ? 'checked' : ''}>
                                                <span class="task-text">${Utils.escapeHtml(task.text)}</span>
                                                <button class="task-expand-btn ${task.notes && task.notes.length > 0 ? 'expanded' : ''}" 
                                                        data-task-id="${task.id}">▶</button>
                                            </div>
                                            <div class="task-details ${task.notes && task.notes.length > 0 ? 'show' : ''}">
                                                <div class="task-notes">
                                                    ${task.notes ? task.notes.map(note => `
                                                        <div class="task-note">
                                                            <span class="note-date">${Utils.formatShortDate(note.date)}</span>
                                                            <span class="note-text">${Utils.escapeHtml(note.text)}</span>
                                                        </div>
                                                    `).join('') : ''}
                                                </div>
                                                <button class="btn-add-note" data-goal-id="${goal.id}" data-task-id="${task.id}">+ 기록 추가</button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            ${!isCompleted ? `
                                <div class="quick-task-add">
                                    <input type="text" class="quick-task-input" 
                                           placeholder="빠른 태스크 추가..." 
                                           data-goal-id="${goal.id}">
                                    <button class="btn-quick-add" data-goal-id="${goal.id}">+</button>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${hasTasks ? `
                            <div class="progress-section">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${taskProgress}%"></div>
                                </div>
                                <div class="progress-text">
                                    <span>진행률</span>
                                    <span>${taskProgress}%</span>
                                </div>
                            </div>
                        ` : ''}
                    ` : ''}
                    
                    <div class="goal-actions">
                        ${!isCompleted ? `
                            <button class="action-btn" data-goal-id="${goal.id}" onclick="Controller.handleGoalEdit('${goal.id}')">
                                📝 편집
                            </button>
                            <button class="action-btn" data-goal-id="${goal.id}" onclick="Controller.handleSchedule('${goal.id}')">
                                🗓️ 일정
                            </button>
                            <button class="action-btn complete btn-complete" data-goal-id="${goal.id}">
                                ✅ 완료
                            </button>
                        ` : `
                            ${hasImage ? `
                                <button class="action-btn btn-view-image" data-goal-id="${goal.id}">
                                    📷 사진
                                </button>
                            ` : ''}
                            <button class="action-btn btn-share" data-goal-id="${goal.id}">
                                🔗 공유
                            </button>
                            <button class="action-btn" data-goal-id="${goal.id}" onclick="Controller.handleGoalReopen('${goal.id}')">
                                🔄 다시 열기
                            </button>
                        `}
                    </div>
                    
                    ${isCompleted && goal.completionNote ? `
                        <div class="goal-completion-banner" style="margin-top: 16px; padding: 12px; background: #f0f9ff; border-radius: 8px;">
                            <div class="completion-header" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span class="completion-date" style="font-size: 12px; color: #64748b;">${Utils.formatDate(goal.completedAt)}</span>
                                ${goal.completionEmotion ? `
                                    <span class="completion-emotion">
                                        ${CONFIG.EMOTIONS[goal.completionEmotion]?.emoji || '😊'}
                                    </span>
                                ` : ''}
                            </div>
                            <p class="completion-note" style="font-size: 14px; color: #475569; margin: 0;">${Utils.escapeHtml(goal.completionNote)}</p>
                        </div>
                    ` : ''}
                </article>
            `;
        },

        // 추천 카드 렌더링
        renderRecommendations(recommendations) {
            const container = this.elements.recommendationCards;
            if (!container) return;

            if (recommendations.length === 0) {
                container.innerHTML = '<p style="color: #718096; font-size: 14px;">추천을 생성중입니다...</p>';
                return;
            }

            container.innerHTML = recommendations.map(rec => `
                <div class="recommendation-chip btn-add-recommendation" 
                     data-text="${Utils.escapeHtml(rec.text)}" 
                     data-category="${rec.category}"
                     title="${Utils.escapeHtml(rec.reason)}">
                    ${CONFIG.CATEGORIES[rec.category]?.icon || '✨'} ${Utils.escapeHtml(rec.text)}
                </div>
            `).join('');
        },

        // 갤러리 렌더링
        renderGallery(completedGoals) {
            const container = this.elements.galleryGrid;
            if (!container) return;

            if (completedGoals.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>완료된 목표가 없습니다</h3>
                        <p>첫 번째 목표를 달성해보세요!</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = completedGoals.map(goal => {
                const categoryInfo = CONFIG.CATEGORIES[goal.category] || CONFIG.CATEGORIES.other;
                const emotion = CONFIG.EMOTIONS[goal.completionEmotion];
                
                return `
                    <div class="gallery-item" data-goal-id="${goal.id}">
                        ${goal.completionImage ? `
                            <div class="gallery-image">
                                <img src="${goal.completionImage}" alt="${Utils.escapeHtml(goal.text)}" loading="lazy">
                            </div>
                        ` : `
                            <div class="gallery-placeholder">
                                <span class="placeholder-icon">${categoryInfo.icon}</span>
                            </div>
                        `}
                        <div class="gallery-content">
                            <h4>${Utils.escapeHtml(goal.text)}</h4>
                            <p class="gallery-date">${Utils.formatDate(goal.completedAt)}</p>
                            ${emotion ? `
                                <span class="gallery-emotion">
                                    ${emotion.emoji} ${emotion.name}
                                </span>
                            ` : ''}
                            ${goal.completionNote ? `
                                <p class="gallery-note">${Utils.escapeHtml(goal.completionNote)}</p>
                            ` : ''}
                        </div>
                        <div class="gallery-actions">
                            <button class="btn-share-achievement" data-goal-id="${goal.id}">
                                공유하기
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        },

        // 여정 타임라인 렌더링
        renderJourneyTimeline(completedGoals) {
            const container = this.elements.achievementTimeline;
            if (!container) return;

            if (completedGoals.length === 0) {
                container.innerHTML = `
                    <div class="timeline-empty">
                        <div class="timeline-empty-icon">🌟</div>
                        <div class="timeline-empty-title">아직 달성한 목표가 없습니다</div>
                        <div class="timeline-empty-subtitle">첫 번째 목표를 달성해서 여정을 시작해보세요!</div>
                    </div>
                `;
                return;
            }

            container.innerHTML = completedGoals
                .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                .slice(0, 10)
                .map((goal, index) => {
                    const categoryInfo = CONFIG.CATEGORIES[goal.category] || CONFIG.CATEGORIES.other;
                    
                    return `
                        <div class="timeline-item" style="animation-delay: ${index * 0.1}s">
                            <div class="timeline-content">
                                <div class="timeline-date">${Utils.formatDate(goal.completedAt)}</div>
                                <div class="timeline-goal">${Utils.escapeHtml(goal.text)}</div>
                                <div class="timeline-category category-${goal.category}">
                                    ${categoryInfo.icon} ${categoryInfo.name}
                                </div>
                                ${goal.completionNote ? `
                                    <div class="timeline-emotion">${Utils.escapeHtml(goal.completionNote)}</div>
                                ` : ''}
                            </div>
                            <div class="timeline-dot"></div>
                        </div>
                    `;
                }).join('');
        },

        // 모달 표시/숨기기
        showModal(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;

            modal.style.display = 'block';
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            
            // 포커스 트랩
            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }
        },

        hideModal(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;

            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        },

        // 알림 표시
        showNotification(message, type = 'info') {
            // 기존 알림 제거
            const existingNotification = document.querySelector('.notification');
            if (existingNotification) {
                existingNotification.remove();
            }

            // 새 알림 생성
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <span class="notification-icon">
                    ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <span class="notification-message">${Utils.escapeHtml(message)}</span>
            `;
            
            document.body.appendChild(notification);
            
            // 애니메이션
            requestAnimationFrame(() => {
                notification.classList.add('show');
            });
            
            // 자동 제거
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        },

        // 탭 전환
        switchTab(tabName) {
            // 탭 버튼 업데이트
            this.elements.tabButtons.forEach(btn => {
                const isActive = btn.dataset.tab === tabName;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', isActive);
                btn.setAttribute('tabindex', isActive ? '0' : '-1');
            });

            // 탭 컨텐츠 업데이트
            this.elements.tabContents.forEach(content => {
                const isActive = content.id === `${tabName}-tab`;
                content.classList.toggle('active', isActive);
                content.style.display = isActive ? 'block' : 'none';
                content.setAttribute('aria-hidden', !isActive);
            });

            DataModel.state.activeTab = tabName;
            
            // 탭별 초기화
            this.initializeTab(tabName);
        },

        // 탭 초기화
        initializeTab(tabName) {
            switch (tabName) {
                case 'journey':
                    Controller.initJourneyTab();
                    break;
                case 'gallery':
                    Controller.initGalleryTab();
                    break;
                case 'insights':
                    Controller.initInsightsTab();
                    break;
                case 'social':
                    Controller.initSocialTab();
                    break;
                case 'data':
                    Controller.initDataTab();
                    break;
            }
        },

        // 로딩 표시
        showLoading(message = '로딩중...') {
            const loading = document.createElement('div');
            loading.className = 'loading-overlay';
            loading.innerHTML = `
                <div class="loading-spinner"></div>
                <p>${Utils.escapeHtml(message)}</p>
            `;
            document.body.appendChild(loading);
        },

        hideLoading() {
            const loading = document.querySelector('.loading-overlay');
            if (loading) loading.remove();
        }
    };

    // ========================================
    // 10. 이벤트 컨트롤러 (Event Controller)
    // ========================================
    const Controller = {
        // 초기화
        init() {
            try {
                // DOM 요소 초기화
                View.initElements();
                
                // 이미지 설정 로드
                ImageProcessor.loadSettings();
                
                // 차트 초기화
                try {
                    ChartManager.initCharts();
                } catch (chartError) {
                    console.warn('Chart initialization skipped:', chartError);
                }
                
                // 데이터 로드
                DataModel.loadProfiles();
                
                // 이벤트 바인딩
                this.bindEvents();
                
                // 초기 렌더링
                this.render();
                
            } catch (error) {
                console.error('Error during initialization:', error);
            }
            
            // 자동 로그아웃 설정
            this.setupAutoLogout();
            
            // 서비스 워커 등록
            this.registerServiceWorker();
        },

        // 이벤트 바인딩
        bindEvents() {
            // 클릭 이벤트 위임
            document.addEventListener('click', this.handleClick.bind(this));
            
            // 키보드 이벤트
            document.addEventListener('keydown', this.handleKeydown.bind(this));
            
            // 폼 이벤트
            this.bindFormEvents();
            
            // 드래그 앤 드롭
            this.bindDragDropEvents();
            
            // 온라인/오프라인 이벤트
            window.addEventListener('online', () => View.showNotification('온라인 상태로 전환되었습니다.', 'success'));
            window.addEventListener('offline', () => View.showNotification('오프라인 상태입니다. 일부 기능이 제한될 수 있습니다.', 'warning'));
        },

        // 클릭 이벤트 핸들러
        handleClick(e) {
            const target = e.target;
            
            // 프로필 선택
            if (target.closest('.profile-card:not(.add-profile):not(.guest-profile)')) {
                const profileId = target.closest('.profile-card').dataset.profileId;
                this.handleProfileSelect(profileId);
            }
            
            // 새 프로필 추가
            if (target.closest('#addProfileBtn')) {
                this.handleNewProfile();
            }
            
            // 게스트 모드
            if (target.closest('#guestModeBtn')) {
                this.handleGuestMode();
            }

            // 목표 관련 버튼들
            if (target.closest('.btn-complete')) {
                const goalId = target.closest('.btn-complete').dataset.goalId;
                this.handleGoalComplete(goalId);
            }

            if (target.closest('.btn-delete')) {
                const goalId = target.closest('.btn-delete').dataset.goalId;
                this.handleGoalDelete(goalId);
            }

            if (target.closest('.btn-task')) {
                const goalId = target.closest('.btn-task').dataset.goalId;
                this.handleTaskManager(goalId);
            }
            
            // 빠른 태스크 추가 버튼
            if (target.closest('.btn-quick-add')) {
                const goalId = target.closest('.btn-quick-add').dataset.goalId;
                const input = document.querySelector(`.quick-task-input[data-goal-id="${goalId}"]`);
                if (input && input.value.trim()) {
                    this.handleQuickTaskAdd(goalId, input.value.trim());
                    input.value = '';
                }
            }
            
            // 태스크 확장/축소 버튼
            if (target.closest('.task-expand-btn')) {
                const btn = target.closest('.task-expand-btn');
                const taskItem = btn.closest('.task-item');
                const taskDetails = taskItem.querySelector('.task-details');
                
                btn.classList.toggle('expanded');
                taskDetails.classList.toggle('show');
            }
            
            // 태스크 체크박스
            if (target.classList.contains('task-checkbox')) {
                const goalId = target.dataset.goalId;
                const taskId = target.dataset.taskId;
                const completed = target.checked;
                this.handleTaskToggle(goalId, taskId, completed);
            }
            
            // 노트 추가 버튼
            if (target.classList.contains('btn-add-note')) {
                const goalId = target.dataset.goalId;
                const taskId = target.dataset.taskId;
                this.handleAddNoteClick(goalId, taskId);
            }

            if (target.closest('.btn-emotion')) {
                const goalId = target.closest('.btn-emotion').dataset.goalId;
                this.handleEmotionCheck(goalId);
            }

            if (target.closest('.btn-share')) {
                const goalId = target.closest('.btn-share').dataset.goalId;
                this.handleShareGoal(goalId);
            }

            if (target.closest('.btn-view-image')) {
                const goalId = target.closest('.btn-view-image').dataset.goalId;
                this.handleViewImage(goalId);
            }

            // 필터 버튼
            if (target.closest('.filter-btn')) {
                const filter = target.dataset.category;
                this.handleFilterChange(filter);
            }

            // 탭 전환
            if (target.closest('.nav-tab')) {
                const tab = target.dataset.tab;
                View.switchTab(tab);
            }

            // 추천 추가
            if (target.closest('.btn-add-recommendation')) {
                const text = target.dataset.text;
                const category = target.dataset.category;
                this.handleAddRecommendation(text, category);
            }

            // 모달 닫기
            if (target.classList.contains('modal') || target.closest('.btn-cancel')) {
                const modal = target.closest('.modal');
                if (modal) View.hideModal(modal.id);
            }

            // 프로필 관리
            if (target.closest('#profileManagerBtn')) {
                this.handleProfileManager();
            }

            // 이미지 설정
            if (target.closest('#imageSettingsBtn')) {
                this.handleImageSettings();
            }

            // 태스크 관련
            if (target.closest('.task-checkbox')) {
                const goalId = target.dataset.goalId;
                const taskId = target.dataset.taskId;
                this.handleTaskToggle(goalId, taskId, target.checked);
            }

            if (target.closest('.btn-delete-task')) {
                const goalId = target.dataset.goalId;
                const taskId = target.dataset.taskId;
                this.handleTaskDelete(goalId, taskId);
            }

            // 갤러리 공유
            if (target.closest('.btn-share-achievement')) {
                const goalId = target.dataset.goalId;
                this.handleShareAchievement(goalId);
            }
        },

        // 키보드 이벤트 핸들러
        handleKeydown(e) {
            // ESC 키로 모달 닫기
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal[style*="block"]');
                if (openModal) {
                    View.hideModal(openModal.id);
                }
            }

            // 탭 네비게이션 (Alt + 숫자)
            if (e.altKey && e.key >= '1' && e.key <= '6') {
                const tabs = ['goals', 'journey', 'gallery', 'insights', 'social', 'data'];
                const tabIndex = parseInt(e.key) - 1;
                if (tabs[tabIndex]) {
                    View.switchTab(tabs[tabIndex]);
                }
            }
            
            // 빠른 태스크 추가 (Enter 키)
            if (e.key === 'Enter' && e.target.classList.contains('quick-task-input')) {
                e.preventDefault();
                const goalId = e.target.dataset.goalId;
                if (e.target.value.trim()) {
                    this.handleQuickTaskAdd(goalId, e.target.value.trim());
                    e.target.value = '';
                }
            }
        },

        // 폼 이벤트 바인딩
        bindFormEvents() {
            // 목표 추가
            const addGoalBtn = document.getElementById('addGoalBtn');
            if (addGoalBtn) {
                addGoalBtn.addEventListener('click', () => this.handleGoalAdd());
            }

            // 엔터키로 목표 추가
            const goalInput = document.getElementById('goalInput');
            if (goalInput) {
                goalInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.handleGoalAdd();
                    }
                });
            }

            // 검색
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('input', Utils.debounce((e) => {
                    DataModel.state.searchQuery = e.target.value;
                    this.render();
                }, 300));
            }

            // 정렬
            const sortSelect = document.getElementById('sortSelect');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    DataModel.state.sortOrder = e.target.value;
                    this.render();
                });
            }

            // 완료 모달 저장
            const saveCompletionBtn = document.getElementById('saveCompletionBtn');
            if (saveCompletionBtn) {
                saveCompletionBtn.addEventListener('click', () => this.saveGoalCompletion());
            }

            // 이미지 업로드
            const imageInput = document.getElementById('completionImage');
            if (imageInput) {
                imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
            }

            // 태스크 추가
            const addTaskBtn = document.getElementById('addTaskBtn');
            if (addTaskBtn) {
                addTaskBtn.addEventListener('click', () => this.handleTaskAdd());
            }

            // 태스크 필터
            document.querySelectorAll('.task-filter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.task-filter-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.filterTasks(e.target.dataset.filter);
                });
            });

            // 마일스톤 추가 버튼
            const addMilestoneBtn = document.getElementById('addMilestoneBtn');
            if (addMilestoneBtn) {
                addMilestoneBtn.addEventListener('click', () => {
                    if (this.currentTaskGoalId) {
                        this.handleMilestoneAdd(this.currentTaskGoalId);
                    }
                });
            }

            // 마일스톤 저장 버튼
            const saveMilestoneBtn = document.getElementById('saveMilestoneBtn');
            if (saveMilestoneBtn) {
                saveMilestoneBtn.addEventListener('click', () => {
                    if (this.currentTaskGoalId) {
                        this.handleMilestoneSave(this.currentTaskGoalId);
                    }
                });
            }

            // 마일스톤 취소 버튼
            const cancelMilestoneBtn = document.getElementById('cancelMilestoneBtn');
            if (cancelMilestoneBtn) {
                cancelMilestoneBtn.addEventListener('click', () => {
                    document.getElementById('milestoneForm').style.display = 'none';
                    document.getElementById('addMilestoneBtn').style.display = 'block';
                    document.getElementById('milestoneTitle').value = '';
                    document.getElementById('milestoneDate').value = '';
                });
            }

            // 마일스톤 삭제 버튼 (동적으로 생성되므로 이벤트 위임 사용)
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-delete-milestone')) {
                    const goalId = e.target.dataset.goalId;
                    const milestoneId = e.target.dataset.milestoneId;
                    this.handleMilestoneDelete(goalId, milestoneId);
                }
            });
        },

        // 드래그 앤 드롭 이벤트
        bindDragDropEvents() {
            const dropZones = document.querySelectorAll('.image-drop-zone');
            
            dropZones.forEach(zone => {
                zone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    zone.classList.add('drag-over');
                });

                zone.addEventListener('dragleave', () => {
                    zone.classList.remove('drag-over');
                });

                zone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    zone.classList.remove('drag-over');
                    
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                        this.handleImageDrop(files[0]);
                    }
                });
            });
        },

        // 렌더링
        render() {
            const profiles = DataModel.state.profiles;
            const currentProfile = DataModel.state.currentProfile;

            if (!currentProfile) {
                // 프로필 선택 화면
                const profileSelector = document.getElementById('profileSelector');
                const mainApp = document.getElementById('mainApp');
                
                if (profileSelector) profileSelector.style.display = 'block';
                if (mainApp) mainApp.classList.remove('active');
                
                View.renderProfileSelector(profiles);
            } else {
                // 메인 앱 화면
                document.getElementById('profileSelector').style.display = 'none';
                document.getElementById('mainApp').classList.add('active');
                
                // 현재 사용자 이름 표시
                if (View.elements.currentUserName) {
                    View.elements.currentUserName.textContent = currentProfile.name;
                }

                // 통계 업데이트
                const stats = DataModel.getStats();
                View.updateStats(stats);

                // 필터링된 목록 렌더링
                const filteredGoals = DataModel.getFilteredGoals(
                    DataModel.state.activeFilter,
                    DataModel.state.searchQuery,
                    DataModel.state.sortOrder
                );
                View.renderBucketList(filteredGoals);

                // 추천 렌더링
                const recommendations = AIRecommendation.getPersonalizedRecommendations(currentProfile);
                View.renderRecommendations(recommendations);

                // 현재 탭에 따른 추가 렌더링
                if (DataModel.state.activeTab === 'journey') {
                    this.renderJourneyTab();
                } else if (DataModel.state.activeTab === 'gallery') {
                    this.renderGalleryTab();
                }
            }
        },

        // 프로필 선택 핸들러
        handleProfileSelect(profileId) {
            const profile = DataModel.state.profiles.find(p => p.id === profileId);
            if (profile) {
                DataModel.setCurrentProfile(profile);
                this.render();
                View.showNotification(`${profile.name}님, 환영합니다!`, 'success');
            }
        },

        // 새 프로필 생성
        handleNewProfile() {
            View.showModal('newUserModal');
            
            const input = document.getElementById('newUserNameInput');
            const createBtn = document.getElementById('createUserBtn');
            
            if (input && createBtn) {
                input.focus();
                
                createBtn.onclick = () => {
                    const name = input.value.trim();
                    if (name) {
                        const profile = DataModel.createProfile(name);
                        DataModel.setCurrentProfile(profile);
                        View.hideModal('newUserModal');
                        this.render();
                        View.showNotification('새 프로필이 생성되었습니다!', 'success');
                    } else {
                        View.showNotification('이름을 입력해주세요.', 'warning');
                    }
                };
            }
        },

        // 게스트 모드
        handleGuestMode() {
            const guestProfile = {
                id: 'guest',
                name: '게스트',
                bucketList: [],
                createdAt: new Date().toISOString(),
                isGuest: true
            };
            
            DataModel.setCurrentProfile(guestProfile);
            this.render();
            View.showNotification('게스트 모드로 시작합니다. 데이터는 저장되지 않습니다.', 'info');
        },

        // 목표 추가
        handleGoalAdd() {
            const input = View.elements.goalInput;
            const categorySelect = View.elements.categorySelect;
            
            if (!input || !categorySelect) return;

            const text = input.value.trim();
            const category = categorySelect.value;

            if (!text) {
                View.showNotification('목표를 입력해주세요.', 'warning');
                input.focus();
                return;
            }

            // 중복 확인
            const exists = DataModel.state.currentProfile?.bucketList.some(
                g => g.text.toLowerCase() === text.toLowerCase()
            );
            
            if (exists) {
                View.showNotification('이미 동일한 목표가 있습니다.', 'warning');
                return;
            }

            DataModel.addGoal(text, category);
            input.value = '';
            this.render();
            
            // 동기부여 메시지
            const message = AIRecommendation.getMotivationalMessage({ category });
            View.showNotification(message, 'success');
        },

        // 추천 추가
        handleAddRecommendation(text, category) {
            DataModel.addGoal(text, category);
            this.render();
            View.showNotification('추천 목표가 추가되었습니다!', 'success');
        },

        // 목표 완료
        handleGoalComplete(goalId) {
            this.currentCompletingGoalId = goalId;
            
            View.showModal('completionModal');
            
            // 오늘 날짜 설정
            const dateInput = document.getElementById('completionDate');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
                dateInput.max = new Date().toISOString().split('T')[0];
            }
            
            // 이미지 미리보기 초기화
            const preview = document.getElementById('imagePreview');
            if (preview) preview.innerHTML = '';
        },

        // 완료 저장
        saveGoalCompletion() {
            if (!this.currentCompletingGoalId) return;

            const date = document.getElementById('completionDate').value;
            const emotion = document.getElementById('completionEmotion').value;
            const note = document.getElementById('completionNote').value;
            const imageInput = document.getElementById('completionImage');
            
            let completionData = { date, emotion, note };

            // 이미지 처리
            if (imageInput && imageInput.files.length > 0) {
                View.showLoading('이미지 처리중...');
                
                ImageProcessor.compressImage(imageInput.files[0])
                    .then(dataUrl => {
                        completionData.image = dataUrl;
                        DataModel.completeGoal(this.currentCompletingGoalId, completionData);
                        View.hideLoading();
                        View.hideModal('completionModal');
                        this.render();
                        View.showNotification('축하합니다! 목표를 달성했습니다! 🎉', 'success');
                        
                        // 달성 애니메이션 효과
                        this.showAchievementAnimation();
                    })
                    .catch(err => {
                        View.hideLoading();
                        View.showNotification('이미지 처리 중 오류가 발생했습니다.', 'error');
                        console.error(err);
                    });
            } else {
                DataModel.completeGoal(this.currentCompletingGoalId, completionData);
                View.hideModal('completionModal');
                this.render();
                View.showNotification('축하합니다! 목표를 달성했습니다! 🎉', 'success');
                
                // 달성 애니메이션 효과
                this.showAchievementAnimation();
            }
        },

        // 달성 애니메이션
        showAchievementAnimation() {
            const confetti = document.createElement('div');
            confetti.className = 'achievement-confetti';
            confetti.innerHTML = '🎉🎊✨🌟🎯';
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        },

        // 목표 삭제
        handleGoalDelete(goalId) {
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return;

            const confirmMessage = goal.completed ? 
                '완료된 목표를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.' :
                '정말로 이 목표를 삭제하시겠습니까?';

            if (confirm(confirmMessage)) {
                DataModel.deleteGoal(goalId);
                this.render();
                View.showNotification('목표가 삭제되었습니다.', 'info');
            }
        },

        // 감정 체크인
        handleEmotionCheck(goalId) {
            this.currentEmotionGoalId = goalId;
            View.showModal('emotionCheckModal');
            
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (goal) {
                document.getElementById('emotionGoalText').textContent = goal.text;
            }
        },

        // 태스크 관리
        handleTaskManager(goalId) {
            this.currentTaskGoalId = goalId;
            View.showModal('taskManagerModal');
            
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return;

            // 목표 제목 표시
            const titleEl = document.getElementById('taskGoalTitle');
            if (titleEl) {
                titleEl.textContent = goal.text;
            }

            // 태스크 목록 렌더링
            this.renderTasks(goalId);
            
            // 마일스톤 렌더링
            this.renderMilestones(goalId);
        },

        // 태스크 렌더링
        renderTasks(goalId) {
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return;

            const tasks = goal.tasks || [];
            const container = document.getElementById('taskList');
            const emptyMessage = document.getElementById('emptyTasksMessage');

            if (!container) return;

            if (tasks.length === 0) {
                container.innerHTML = '';
                if (emptyMessage) emptyMessage.style.display = 'block';
            } else {
                if (emptyMessage) emptyMessage.style.display = 'none';
                
                container.innerHTML = tasks.map(task => `
                    <li class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                        <input type="checkbox" 
                               class="task-checkbox" 
                               ${task.completed ? 'checked' : ''}
                               data-goal-id="${goalId}"
                               data-task-id="${task.id}">
                        <span class="task-text" 
                              data-goal-id="${goalId}"
                              data-task-id="${task.id}">${Utils.escapeHtml(task.text)}</span>
                        <span class="task-priority priority-${task.priority}">${task.priority}</span>
                        <div class="task-actions">
                            <button class="btn-edit-task" 
                                    data-goal-id="${goalId}"
                                    data-task-id="${task.id}"
                                    title="편집">
                                ✏️
                            </button>
                            <button class="btn-delete-task" 
                                    data-goal-id="${goalId}"
                                    data-task-id="${task.id}"
                                    title="삭제">
                                ❌
                            </button>
                        </div>
                    </li>
                `).join('');
            }

            // 진행률 업데이트
            const completedCount = tasks.filter(t => t.completed).length;
            const totalCount = tasks.length;
            const percentage = Utils.calculatePercentage(completedCount, totalCount);

            document.getElementById('taskProgressPercent').textContent = percentage + '%';
            document.getElementById('taskProgressFill').style.width = percentage + '%';
            document.getElementById('completedTaskCount').textContent = completedCount;
            document.getElementById('totalTaskCount').textContent = totalCount;

            // 태스크 이벤트 바인딩
            setTimeout(() => {
                // 체크박스 이벤트
                container.querySelectorAll('.task-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', (e) => {
                        const goalId = e.target.dataset.goalId;
                        const taskId = e.target.dataset.taskId;
                        const completed = e.target.checked;
                        this.handleTaskToggle(goalId, taskId, completed);
                    });
                });

                // 편집 버튼 이벤트
                container.querySelectorAll('.btn-edit-task').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const goalId = e.target.dataset.goalId;
                        const taskId = e.target.dataset.taskId;
                        this.handleTaskEdit(goalId, taskId);
                    });
                });

                // 삭제 버튼 이벤트
                container.querySelectorAll('.btn-delete-task').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const goalId = e.target.dataset.goalId;
                        const taskId = e.target.dataset.taskId;
                        this.handleTaskDelete(goalId, taskId);
                    });
                });
            }, 0);
        },

        // 태스크 추가
        handleTaskAdd() {
            const input = document.getElementById('newTaskInput');
            const prioritySelect = document.getElementById('taskPriority');
            
            if (!input || !this.currentTaskGoalId) return;

            const text = input.value.trim();
            if (!text) {
                View.showNotification('태스크를 입력해주세요.', 'warning');
                return;
            }

            const taskData = {
                text: text,
                priority: prioritySelect.value
            };

            DataModel.addTask(this.currentTaskGoalId, taskData);
            input.value = '';
            this.renderTasks(this.currentTaskGoalId);
            this.render(); // 메인 화면도 업데이트 (진행률 반영)
        },
        
        // 빠른 태스크 추가
        handleQuickTaskAdd(goalId, taskText) {
            const taskData = {
                text: taskText,
                priority: 'medium' // 기본 우선순위
            };

            DataModel.addTask(goalId, taskData);
            this.render(); // 메인 화면 업데이트 (진행률 반영)
            View.showNotification('태스크가 추가되었습니다.', 'success');
        },

        // 태스크 토글
        handleTaskToggle(goalId, taskId, completed) {
            DataModel.updateTask(goalId, taskId, { completed });
            this.renderTasks(goalId);
            this.render();
            
            if (completed) {
                View.showNotification('태스크를 완료했습니다! 👍', 'success');
            }
        },

        // 태스크 삭제
        handleTaskDelete(goalId, taskId) {
            if (confirm('이 태스크를 삭제하시겠습니까?')) {
                DataModel.deleteTask(goalId, taskId);
                this.renderTasks(goalId);
                this.render();
            }
        },

        // 태스크 편집 시작
        handleTaskEdit(goalId, taskId) {
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return;

            const task = goal.tasks?.find(t => t.id === taskId);
            if (!task) return;

            const taskItem = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
            if (!taskItem) return;

            // 이미 편집 중인 경우 무시
            if (taskItem.classList.contains('editing')) return;

            // 편집 모드로 전환
            taskItem.classList.add('editing');

            // 편집 폼 생성
            const editForm = document.createElement('div');
            editForm.className = 'task-edit-form';
            editForm.innerHTML = `
                <input type="text" 
                       class="task-edit-input" 
                       value="${Utils.escapeHtml(task.text)}"
                       data-original="${Utils.escapeHtml(task.text)}">
                <select class="task-edit-priority">
                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>낮음</option>
                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>보통</option>
                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>높음</option>
                </select>
                <div class="task-edit-actions">
                    <button class="btn-save-edit" data-goal-id="${goalId}" data-task-id="${taskId}">저장</button>
                    <button class="btn-cancel-edit" data-task-id="${taskId}">취소</button>
                </div>
            `;

            taskItem.appendChild(editForm);

            // 입력 필드에 포커스
            const input = editForm.querySelector('.task-edit-input');
            input.focus();
            input.select();

            // 엔터키로 저장
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleTaskEditSave(goalId, taskId);
                }
            });

            // ESC키로 취소
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.handleTaskEditCancel(taskId);
                }
            });
        },

        // 태스크 편집 저장
        handleTaskEditSave(goalId, taskId) {
            const taskItem = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
            if (!taskItem) return;

            const input = taskItem.querySelector('.task-edit-input');
            const prioritySelect = taskItem.querySelector('.task-edit-priority');

            const newText = input.value.trim();
            const newPriority = prioritySelect.value;

            if (!newText) {
                View.showNotification('태스크 내용을 입력해주세요.', 'warning');
                return;
            }

            // 데이터 업데이트
            DataModel.updateTask(goalId, taskId, {
                text: newText,
                priority: newPriority
            });

            // UI 업데이트
            this.renderTasks(goalId);
            this.render();
            View.showNotification('태스크가 수정되었습니다.', 'success');
        },

        // 태스크 편집 취소
        handleTaskEditCancel(taskId) {
            const taskItem = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
            if (!taskItem) return;

            const editForm = taskItem.querySelector('.task-edit-form');
            if (editForm) {
                editForm.remove();
            }

            taskItem.classList.remove('editing');
        },

        // 태스크 필터링
        filterTasks(filter) {
            const taskItems = document.querySelectorAll('.task-item');
            
            taskItems.forEach(item => {
                const isCompleted = item.classList.contains('completed');
                
                switch (filter) {
                    case 'all':
                        item.style.display = '';
                        break;
                    case 'active':
                        item.style.display = isCompleted ? 'none' : '';
                        break;
                    case 'completed':
                        item.style.display = isCompleted ? '' : 'none';
                        break;
                }
            });
        },

        // 마일스톤 렌더링
        renderMilestones(goalId) {
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return;

            const milestones = goal.milestones || [];
            const container = document.getElementById('milestoneList');
            const emptyMessage = document.getElementById('emptyMilestonesMessage');

            if (!container) return;

            if (milestones.length === 0) {
                container.innerHTML = '';
                if (emptyMessage) emptyMessage.style.display = 'block';
            } else {
                if (emptyMessage) emptyMessage.style.display = 'none';
                
                container.innerHTML = milestones.map(milestone => {
                    const tasks = goal.tasks || [];
                    const milestoneTasks = tasks.filter(t => milestone.taskIds.includes(t.id));
                    const completedCount = milestoneTasks.filter(t => t.completed).length;
                    const totalCount = milestoneTasks.length;
                    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                    const isAchieved = progress === 100;

                    return `
                        <div class="milestone-item ${isAchieved ? 'achieved' : ''}" data-milestone-id="${milestone.id}">
                            <div class="milestone-header">
                                <span class="milestone-title-text">${Utils.escapeHtml(milestone.title)}</span>
                                <span class="milestone-date">목표일: ${Utils.formatDate(milestone.targetDate)}</span>
                            </div>
                            <div class="milestone-progress">
                                <div class="milestone-progress-bar">
                                    <div class="milestone-progress-fill" style="width: ${progress}%"></div>
                                </div>
                                <span>${progress}%</span>
                            </div>
                            <div class="milestone-tasks-preview">
                                ${completedCount}/${totalCount} 태스크 완료
                            </div>
                            <div class="milestone-actions">
                                ${isAchieved ? 
                                    '<span class="btn-milestone-action">🎉</span>' : 
                                    `<button class="btn-milestone-action btn-delete-milestone" 
                                             data-goal-id="${goalId}" 
                                             data-milestone-id="${milestone.id}">❌</button>`
                                }
                            </div>
                        </div>
                    `;
                }).join('');
            }
        },

        // 마일스톤 추가 핸들러
        handleMilestoneAdd(goalId) {
            const form = document.getElementById('milestoneForm');
            const addBtn = document.getElementById('addMilestoneBtn');
            const taskSelection = document.getElementById('milestoneTaskSelection');
            
            if (!form) return;

            // 폼 표시/숨기기 토글
            if (form.style.display === 'none') {
                form.style.display = 'block';
                addBtn.style.display = 'none';
                
                // 태스크 선택 목록 생성
                const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
                if (goal && goal.tasks) {
                    taskSelection.innerHTML = goal.tasks
                        .filter(task => !task.completed)
                        .map(task => `
                            <div class="task-selection-item">
                                <input type="checkbox" 
                                       id="milestone-task-${task.id}" 
                                       value="${task.id}"
                                       class="milestone-task-checkbox">
                                <label for="milestone-task-${task.id}">
                                    ${Utils.escapeHtml(task.text)}
                                </label>
                            </div>
                        `).join('');
                }
            } else {
                form.style.display = 'none';
                addBtn.style.display = 'block';
            }
        },

        // 마일스톤 저장
        handleMilestoneSave(goalId) {
            const titleInput = document.getElementById('milestoneTitle');
            const dateInput = document.getElementById('milestoneDate');
            const selectedTasks = Array.from(document.querySelectorAll('.milestone-task-checkbox:checked'))
                .map(cb => cb.value);

            if (!titleInput.value.trim()) {
                View.showNotification('마일스톤 제목을 입력해주세요.', 'warning');
                return;
            }

            if (!dateInput.value) {
                View.showNotification('목표 날짜를 선택해주세요.', 'warning');
                return;
            }

            const milestoneData = {
                title: titleInput.value.trim(),
                targetDate: dateInput.value,
                taskIds: selectedTasks
            };

            DataModel.addMilestone(goalId, milestoneData);
            
            // 폼 초기화 및 숨기기
            titleInput.value = '';
            dateInput.value = '';
            document.getElementById('milestoneForm').style.display = 'none';
            document.getElementById('addMilestoneBtn').style.display = 'block';
            
            // 렌더링 업데이트
            this.renderMilestones(goalId);
            View.showNotification('마일스톤이 추가되었습니다!', 'success');
        },

        // 마일스톤 삭제
        handleMilestoneDelete(goalId, milestoneId) {
            if (confirm('이 마일스톤을 삭제하시겠습니까?')) {
                const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
                if (goal && goal.milestones) {
                    goal.milestones = goal.milestones.filter(m => m.id !== milestoneId);
                    DataModel.saveProfiles();
                    this.renderMilestones(goalId);
                    View.showNotification('마일스톤이 삭제되었습니다.', 'info');
                }
            }
        },

        // 이미지 업로드
        handleImageUpload(e) {
            const file = e.target.files[0];
            if (!file) return;

            try {
                ImageProcessor.validateImage(file);
                
                // 미리보기
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.getElementById('imagePreview');
                    if (preview) {
                        preview.innerHTML = `<img src="${e.target.result}" alt="미리보기" style="max-width: 200px;">`;
                    }
                };
                reader.readAsDataURL(file);
            } catch (err) {
                View.showNotification(err.message, 'error');
                e.target.value = '';
            }
        },

        // 이미지 드롭
        handleImageDrop(file) {
            try {
                ImageProcessor.validateImage(file);
                
                // 파일 입력에 설정
                const input = document.getElementById('completionImage');
                if (input) {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    input.files = dataTransfer.files;
                    
                    // 변경 이벤트 트리거
                    input.dispatchEvent(new Event('change'));
                }
            } catch (err) {
                View.showNotification(err.message, 'error');
            }
        },

        // 이미지 보기
        handleViewImage(goalId) {
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal || !goal.completionImage) return;

            // 이미지 모달 생성
            const modal = document.createElement('div');
            modal.className = 'image-view-modal';
            modal.innerHTML = `
                <div class="image-view-content">
                    <img src="${goal.completionImage}" alt="${Utils.escapeHtml(goal.text)}">
                    <button class="close-image-view">✕</button>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 닫기 이벤트
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.classList.contains('close-image-view')) {
                    modal.remove();
                }
            });
        },

        // 목표 공유
        handleShareGoal(goalId) {
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return;

            const shareText = `✅ 버킷리스트 달성!\n\n"${goal.text}"\n\n${goal.completionNote || '목표를 달성했습니다!'}\n\n#버킷리스트 #목표달성`;
            
            if (navigator.share) {
                navigator.share({
                    title: '버킷리스트 달성',
                    text: shareText
                }).catch(err => console.log('공유 취소됨'));
            } else {
                // 클립보드 복사
                navigator.clipboard.writeText(shareText)
                    .then(() => View.showNotification('클립보드에 복사되었습니다!', 'success'))
                    .catch(() => View.showNotification('공유 기능을 사용할 수 없습니다.', 'error'));
            }
        },

        // 달성 카드 공유
        async handleShareAchievement(goalId) {
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return;

            try {
                View.showLoading('달성 카드 생성중...');
                
                const cardDataUrl = await PDFGenerator.generateAchievementCard(
                    goal,
                    DataModel.state.currentProfile.name
                );
                
                View.hideLoading();
                
                // 다운로드 링크 생성
                const link = document.createElement('a');
                link.download = `achievement-${goal.id}.png`;
                link.href = cardDataUrl;
                link.click();
                
                View.showNotification('달성 카드가 다운로드되었습니다!', 'success');
            } catch (err) {
                View.hideLoading();
                View.showNotification('달성 카드 생성에 실패했습니다.', 'error');
                console.error(err);
            }
        },
        
        // 노트 추가 클릭 핸들러
        handleAddNoteClick(goalId, taskId) {
            const noteBtn = document.querySelector(`.btn-add-note[data-task-id="${taskId}"]`);
            const taskDetails = noteBtn.closest('.task-details');
            
            // 기존 폼이 있는지 확인
            let noteForm = taskDetails.querySelector('.note-input-form');
            
            // 폼이 없으면 생성
            if (!noteForm) {
                noteForm = document.createElement('div');
                noteForm.className = 'note-input-form';
                noteForm.innerHTML = `
                    <textarea class="note-input" placeholder="진행 상황, 메모, 참고사항 등을 기록하세요..."></textarea>
                    <div class="note-actions">
                        <button class="note-cancel-btn" data-goal-id="${goalId}" data-task-id="${taskId}">취소</button>
                        <button class="note-save-btn" data-goal-id="${goalId}" data-task-id="${taskId}">저장</button>
                    </div>
                `;
                taskDetails.appendChild(noteForm);
                
                // 이벤트 리스너 추가
                noteForm.querySelector('.note-cancel-btn').addEventListener('click', (e) => {
                    this.handleNoteCancelClick(e.target.dataset.goalId, e.target.dataset.taskId);
                });
                
                noteForm.querySelector('.note-save-btn').addEventListener('click', (e) => {
                    this.handleNoteSaveClick(e.target.dataset.goalId, e.target.dataset.taskId);
                });
            }
            
            noteForm.classList.add('show');
            noteBtn.style.display = 'none';
            noteForm.querySelector('.note-input').focus();
        },
        
        // 노트 취소 클릭 핸들러
        handleNoteCancelClick(goalId, taskId) {
            const noteBtn = document.querySelector(`.btn-add-note[data-task-id="${taskId}"]`);
            const noteForm = noteBtn.closest('.task-details').querySelector('.note-input-form');
            
            noteForm.classList.remove('show');
            noteBtn.style.display = 'block';
            noteForm.querySelector('.note-input').value = '';
        },
        
        // 노트 저장 클릭 핸들러
        handleNoteSaveClick(goalId, taskId) {
            const noteBtn = document.querySelector(`.btn-add-note[data-task-id="${taskId}"]`);
            const noteForm = noteBtn.closest('.task-details').querySelector('.note-input-form');
            const noteText = noteForm.querySelector('.note-input').value.trim();
            
            if (!noteText) {
                View.showNotification('노트 내용을 입력해주세요.', 'warning');
                return;
            }
            
            // 노트 데이터 추가
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (goal && goal.tasks) {
                const task = goal.tasks.find(t => t.id === taskId);
                if (task) {
                    if (!task.notes) {
                        task.notes = [];
                    }
                    
                    task.notes.push({
                        id: Utils.generateId(),
                        text: noteText,
                        date: new Date().toISOString()
                    });
                    
                    DataModel.saveProfiles();
                    
                    // UI 업데이트
                    noteForm.classList.remove('show');
                    noteBtn.style.display = 'block';
                    noteForm.querySelector('.note-input').value = '';
                    
                    // 전체 렌더링
                    this.render();
                    
                    View.showNotification('노트가 추가되었습니다.', 'success');
                }
            }
        },

        // 목표 편집 핸들러
        handleGoalEdit(goalId) {
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return;
            
            // TODO: 목표 편집 모달 구현
            View.showNotification('목표 편집 기능은 준비 중입니다.', 'info');
        },
        
        // 일정 관리 핸들러
        handleSchedule(goalId) {
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return;
            
            // TODO: 일정 관리 모달 구현
            View.showNotification('일정 관리 기능은 준비 중입니다.', 'info');
        },
        
        // 목표 다시 열기 핸들러
        handleGoalReopen(goalId) {
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return;
            
            if (confirm('이 목표를 다시 진행 중으로 변경하시겠습니까?')) {
                goal.completed = false;
                goal.completedAt = null;
                goal.completionNote = null;
                goal.completionEmotion = null;
                goal.completionImage = null;
                
                DataModel.saveProfiles();
                this.render();
                View.showNotification('목표가 다시 활성화되었습니다.', 'success');
            }
        },

        // 필터 변경
        handleFilterChange(filter) {
            DataModel.state.activeFilter = filter;
            
            // 필터 버튼 업데이트
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.category === filter);
                btn.setAttribute('aria-pressed', btn.dataset.category === filter);
            });

            this.render();
        },

        // 프로필 관리
        handleProfileManager() {
            View.showModal('profileManagerModal');
            this.renderProfileManager();
        },

        // 프로필 관리자 렌더링
        renderProfileManager() {
            const container = document.getElementById('profileManagerContent');
            if (!container) return;

            const profiles = DataModel.state.profiles;
            
            container.innerHTML = profiles.map(profile => {
                const stats = View.calculateProfileStats(profile);
                const isCurrent = profile.id === DataModel.state.currentProfile?.id;
                
                return `
                    <div class="profile-manager-item ${isCurrent ? 'current' : ''}">
                        <div class="profile-info">
                            <h4>${Utils.escapeHtml(profile.name)}</h4>
                            <p>${stats.total} 목표 · ${stats.completed} 완료</p>
                            <p class="profile-created">생성일: ${Utils.formatDate(profile.createdAt)}</p>
                        </div>
                        <div class="profile-actions">
                            ${!isCurrent ? `
                                <button class="btn-switch-profile" data-profile-id="${profile.id}">
                                    전환
                                </button>
                            ` : '<span class="current-badge">현재</span>'}
                            <button class="btn-export-profile" data-profile-id="${profile.id}">
                                내보내기
                            </button>
                            <button class="btn-delete-profile" data-profile-id="${profile.id}">
                                삭제
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            // 이벤트 바인딩
            container.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-switch-profile')) {
                    const profileId = e.target.dataset.profileId;
                    this.handleProfileSelect(profileId);
                    View.hideModal('profileManagerModal');
                }
                
                if (e.target.classList.contains('btn-export-profile')) {
                    const profileId = e.target.dataset.profileId;
                    this.handleExportProfile(profileId);
                }
                
                if (e.target.classList.contains('btn-delete-profile')) {
                    const profileId = e.target.dataset.profileId;
                    this.handleDeleteProfile(profileId);
                }
            });
        },

        // 프로필 내보내기
        handleExportProfile(profileId) {
            const data = DataModel.exportData(profileId);
            if (!data) return;

            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            const profile = DataModel.state.profiles.find(p => p.id === profileId);
            link.download = `bucketlist-${profile.name}-${new Date().toISOString().split('T')[0]}.json`;
            link.href = url;
            link.click();
            
            URL.revokeObjectURL(url);
            View.showNotification('프로필이 내보내졌습니다.', 'success');
        },

        // 프로필 삭제
        handleDeleteProfile(profileId) {
            const profile = DataModel.state.profiles.find(p => p.id === profileId);
            if (!profile) return;

            if (confirm(`"${profile.name}" 프로필을 삭제하시겠습니까? 모든 데이터가 삭제됩니다.`)) {
                DataModel.deleteProfile(profileId);
                this.renderProfileManager();
                
                if (profileId === DataModel.state.currentProfile?.id) {
                    View.hideModal('profileManagerModal');
                    this.render();
                }
                
                View.showNotification('프로필이 삭제되었습니다.', 'info');
            }
        },

        // 이미지 설정
        handleImageSettings() {
            View.showModal('imageSettingsModal');
            
            // 현재 설정 표시
            const settings = ImageProcessor.settings;
            document.getElementById('qualitySlider').value = settings.quality;
            document.getElementById('qualityValue').textContent = Math.round(settings.quality * 100) + '%';
            document.getElementById('maxWidthInput').value = settings.maxWidth;
            document.getElementById('formatSelect').value = settings.format;
            document.getElementById('autoCompressCheck').checked = settings.autoCompress;
            
            // 이벤트 바인딩
            document.getElementById('qualitySlider').oninput = (e) => {
                document.getElementById('qualityValue').textContent = Math.round(e.target.value * 100) + '%';
            };
            
            document.getElementById('saveImageSettingsBtn').onclick = () => {
                const newSettings = {
                    quality: parseFloat(document.getElementById('qualitySlider').value),
                    maxWidth: parseInt(document.getElementById('maxWidthInput').value),
                    format: document.getElementById('formatSelect').value,
                    autoCompress: document.getElementById('autoCompressCheck').checked
                };
                
                ImageProcessor.updateSettings(newSettings);
                View.hideModal('imageSettingsModal');
                View.showNotification('이미지 설정이 저장되었습니다.', 'success');
            };
        },

        // 여정 탭 렌더링
        renderJourneyTab() {
            const profile = DataModel.state.currentProfile;
            if (!profile) return;

            const completedGoals = profile.bucketList.filter(g => g.completed);
            
            // 타임라인 렌더링
            View.renderJourneyTimeline(completedGoals);
            
            // 카테고리별 진행률
            const categoryStats = DataModel.getStats().byCategory;
            const progressGrid = document.getElementById('categoryProgressGrid');
            
            if (progressGrid) {
                progressGrid.innerHTML = Object.entries(categoryStats)
                    .filter(([_, stats]) => stats.total > 0)
                    .map(([category, stats]) => {
                        const categoryInfo = CONFIG.CATEGORIES[category];
                        const percentage = Utils.calculatePercentage(stats.completed, stats.total);
                        
                        return `
                            <div class="category-progress-card">
                                <div class="category-icon">${categoryInfo.icon}</div>
                                <div class="category-name">${categoryInfo.name}</div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${percentage}%"></div>
                                </div>
                                <div class="progress-text">${stats.completed}/${stats.total} (${percentage}%)</div>
                            </div>
                        `;
                    }).join('');
            }

            // 동기부여 메시지 업데이트
            const dailyInspiration = document.getElementById('inspirationQuote');
            if (dailyInspiration) {
                const quotes = [
                    "꿈을 이루는 것이 중요한 게 아니라, 꿈을 향해 걸어가는 여정 자체가 당신을 성장시킵니다.",
                    "오늘 하루도 당신의 꿈에 한 걸음 더 가까워졌습니다.",
                    "작은 성취가 모여 큰 꿈을 이룹니다.",
                    "포기하지 마세요. 시작이 반입니다.",
                    "당신의 꿈은 충분히 가치있습니다."
                ];
                dailyInspiration.textContent = Utils.getRandomItem(quotes);
            }

            // 감정 차트 업데이트
            this.updateJourneyEmotionChart();
        },

        // 감정 차트 업데이트
        updateJourneyEmotionChart() {
            const bucketList = DataModel.state.currentProfile?.bucketList || [];
            const emotionData = this.analyzeEmotionData(bucketList);
            
            ChartManager.createEmotionChart('journeyEmotionChart', emotionData);
        },

        // 감정 데이터 분석
        analyzeEmotionData(bucketList) {
            const emotionCounts = new Array(Object.keys(CONFIG.EMOTIONS).length).fill(0);
            let totalEntries = 0;

            bucketList.forEach(goal => {
                if (goal.completed && goal.completionEmotion) {
                    const index = Object.keys(CONFIG.EMOTIONS).indexOf(goal.completionEmotion);
                    if (index !== -1) {
                        emotionCounts[index]++;
                        totalEntries++;
                    }
                }

                if (goal.emotionalJourney) {
                    goal.emotionalJourney.forEach(entry => {
                        const index = Object.keys(CONFIG.EMOTIONS).indexOf(entry.emotion);
                        if (index !== -1) {
                            emotionCounts[index]++;
                            totalEntries++;
                        }
                    });
                }
            });

            return totalEntries > 0 ? 
                emotionCounts.map(count => Math.round((count / totalEntries) * 10)) :
                new Array(Object.keys(CONFIG.EMOTIONS).length).fill(5);
        },

        // 갤러리 탭 렌더링
        renderGalleryTab() {
            const profile = DataModel.state.currentProfile;
            if (!profile) return;

            const completedGoals = profile.bucketList.filter(g => g.completed);
            
            // 정렬
            const sortSelect = document.getElementById('gallerySort');
            if (sortSelect) {
                const sortOrder = sortSelect.value;
                
                completedGoals.sort((a, b) => {
                    switch (sortOrder) {
                        case 'date-desc':
                            return new Date(b.completedAt) - new Date(a.completedAt);
                        case 'date-asc':
                            return new Date(a.completedAt) - new Date(b.completedAt);
                        case 'category':
                            return a.category.localeCompare(b.category);
                        case 'emotion':
                            return (a.completionEmotion || '').localeCompare(b.completionEmotion || '');
                        default:
                            return 0;
                    }
                });
            }

            View.renderGallery(completedGoals);
        },

        // 여정 탭 초기화
        initJourneyTab() {
            this.renderJourneyTab();
            
            // 개선된 여정 탭 기능 호출
            if (typeof updateJourneyStats === 'function') {
                updateJourneyStats();
            }
        },

        // 갤러리 탭 초기화
        initGalleryTab() {
            this.renderGalleryTab();
        },

        // 인사이트 탭 초기화
        initInsightsTab() {
            const stats = DataModel.getStats();
            
            // 달성률 차트
            ChartManager.createAchievementChart('achievementChart', stats);
            
            // 카테고리 분포 차트
            ChartManager.createCategoryChart('categoryDistributionChart', stats.byCategory);
            
            // 시간 패턴 차트
            const timeData = this.getTimePatternData();
            ChartManager.createTimePatternChart('timePatternChart', timeData);
            
            // 감정 차트
            const emotionData = this.analyzeEmotionData(DataModel.state.currentProfile?.bucketList || []);
            ChartManager.createEmotionChart('emotionChart', emotionData);

            // 개인 인사이트 업데이트
            this.updatePersonalInsights();
        },

        // 시간 패턴 데이터
        getTimePatternData() {
            const bucketList = DataModel.state.currentProfile?.bucketList || [];
            const monthlyData = {};
            
            bucketList.filter(g => g.completed).forEach(goal => {
                const date = new Date(goal.completedAt);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
            });

            const sortedMonths = Object.keys(monthlyData).sort();
            
            return {
                labels: sortedMonths.map(month => {
                    const [year, mon] = month.split('-');
                    return `${mon}월`;
                }),
                values: sortedMonths.map(month => monthlyData[month])
            };
        },

        // 개인 인사이트 업데이트
        updatePersonalInsights() {
            const container = document.getElementById('personalInsights');
            if (!container) return;

            const profile = DataModel.state.currentProfile;
            if (!profile) return;

            const insights = [];
            
            // 가장 활발한 카테고리
            const stats = DataModel.getStats();
            const mostActiveCategory = Object.entries(stats.byCategory)
                .sort((a, b) => b[1].total - a[1].total)[0];
            
            if (mostActiveCategory) {
                insights.push(`${CONFIG.CATEGORIES[mostActiveCategory[0]].name} 분야에 가장 관심이 많으시네요!`);
            }

            // 달성 패턴
            const completedGoals = profile.bucketList.filter(g => g.completed);
            if (completedGoals.length >= 3) {
                const avgDays = this.calculateAverageCompletionTime(completedGoals);
                insights.push(`평균적으로 목표 설정 후 ${avgDays}일 만에 달성하고 있습니다.`);
            }

            // 감정 패턴
            const dominantEmotion = this.getDominantEmotion(profile.bucketList);
            if (dominantEmotion) {
                insights.push(`목표 달성 시 주로 ${CONFIG.EMOTIONS[dominantEmotion].name}을 느끼시는군요!`);
            }

            container.innerHTML = insights.map(insight => 
                `<div class="insight-item">${insight}</div>`
            ).join('');
        },

        // 평균 달성 시간 계산
        calculateAverageCompletionTime(completedGoals) {
            const times = completedGoals
                .filter(g => g.createdAt && g.completedAt)
                .map(g => {
                    const created = new Date(g.createdAt);
                    const completed = new Date(g.completedAt);
                    return (completed - created) / (1000 * 60 * 60 * 24); // 일 단위
                });

            if (times.length === 0) return 0;
            
            const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
            return Math.round(avg);
        },

        // 주요 감정 파악
        getDominantEmotion(bucketList) {
            const emotionCounts = {};
            
            bucketList.forEach(goal => {
                if (goal.completionEmotion) {
                    emotionCounts[goal.completionEmotion] = (emotionCounts[goal.completionEmotion] || 0) + 1;
                }
            });

            const sorted = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
            return sorted.length > 0 ? sorted[0][0] : null;
        },

        // 소셜 탭 초기화
        initSocialTab() {
            // 소셜 기능 구현
            const shareStats = document.getElementById('shareStats');
            if (shareStats) {
                const stats = DataModel.getStats();
                shareStats.innerHTML = `
                    <h3>나의 버킷리스트 현황</h3>
                    <p>총 ${stats.total}개 목표 중 ${stats.completed}개 달성 (${stats.percentage}%)</p>
                    <button class="btn-share-stats">공유하기</button>
                `;
            }
        },

        // 데이터 탭 초기화
        initDataTab() {
            // 스토리지 사용량
            const storageSize = Storage.getStorageSize();
            const storageSizeEl = document.getElementById('storageSize');
            if (storageSizeEl) {
                storageSizeEl.textContent = `${storageSize} MB`;
            }

            // 내보내기 버튼
            const exportBtn = document.getElementById('exportBtn');
            if (exportBtn) {
                exportBtn.onclick = () => {
                    const data = DataModel.exportData();
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = `bucketlist-backup-${new Date().toISOString().split('T')[0]}.json`;
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);
                    View.showNotification('데이터가 내보내졌습니다.', 'success');
                };
            }

            // 가져오기
            const importFile = document.getElementById('importFile');
            if (importFile) {
                importFile.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            if (DataModel.importData(e.target.result)) {
                                View.showNotification('데이터를 성공적으로 가져왔습니다.', 'success');
                                this.render();
                            } else {
                                View.showNotification('데이터 가져오기에 실패했습니다.', 'error');
                            }
                        } catch (err) {
                            View.showNotification('잘못된 파일 형식입니다.', 'error');
                        }
                    };
                    reader.readAsText(file);
                };
            }

            // PDF 다운로드
            const downloadPdfBtn = document.getElementById('downloadPdfBtn');
            if (downloadPdfBtn) {
                downloadPdfBtn.onclick = async () => {
                    try {
                        View.showLoading('PDF 생성중...');
                        
                        const goals = DataModel.state.currentProfile.bucketList;
                        const pdf = await PDFGenerator.generatePDF(
                            goals,
                            DataModel.state.currentProfile.name
                        );
                        
                        pdf.save(`bucketlist-${DataModel.state.currentProfile.name}.pdf`);
                        
                        View.hideLoading();
                        View.showNotification('PDF가 다운로드되었습니다.', 'success');
                    } catch (err) {
                        View.hideLoading();
                        View.showNotification('PDF 생성에 실패했습니다.', 'error');
                        console.error(err);
                    }
                };
            }
        },

        // 자동 로그아웃 설정
        setupAutoLogout() {
            let logoutTimer;
            let lastActivity = Date.now();

            const resetTimer = () => {
                lastActivity = Date.now();
                clearTimeout(logoutTimer);
                
                if (DataModel.state.currentProfile && !DataModel.state.currentProfile.isGuest) {
                    logoutTimer = setTimeout(() => {
                        // 경고 표시
                        if (Date.now() - lastActivity > CONFIG.AUTO_LOGOUT_TIME - 60000) {
                            View.showNotification('1분 후 자동 로그아웃됩니다.', 'warning');
                        }
                        
                        // 로그아웃
                        if (Date.now() - lastActivity >= CONFIG.AUTO_LOGOUT_TIME) {
                            DataModel.setCurrentProfile(null);
                            this.render();
                            View.showNotification('자동 로그아웃되었습니다.', 'info');
                        }
                    }, CONFIG.AUTO_LOGOUT_TIME);
                }
            };

            // 사용자 활동 감지
            ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(event => {
                document.addEventListener(event, resetTimer, { passive: true });
            });

            resetTimer();
        },

        // 서비스 워커 등록
        registerServiceWorker() {
            // file:// 프로토콜에서는 Service Worker를 등록하지 않음
            if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => {
                        console.log('Service Worker 등록 성공:', registration);
                    })
                    .catch(err => {
                        console.log('Service Worker 등록 실패:', err);
                    });
            } else if (window.location.protocol === 'file:') {
                console.log('Service Worker는 file:// 프로토콜에서 지원되지 않습니다.');
            }
        }
    };

    // ========================================
    // 11. 앱 초기화
    // ========================================
    
    // 전역 에러 핸들링
    window.addEventListener('error', (e) => {
        console.error('앱 오류:', e.error);
        if (!e.error.message.includes('Script error')) {
            const isDev = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
            if (isDev) {
                console.error('상세 에러:', e.error);
            }
            View.showNotification('오류가 발생했습니다. 페이지를 새로고침해주세요.', 'error');
        }
    });

    window.addEventListener('unhandledrejection', (e) => {
        console.error('Promise 오류:', e.reason);
        e.preventDefault();
    });

    // DOM 로드 완료 시 앱 시작
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Controller.init());
    } else {
        Controller.init();
    }

    // 전역 객체로 노출 (디버깅/테스트/확장용)
    window.BucketDreams = {
        version: '2.0.0',
        CONFIG,
        Utils,
        Storage,
        ImageProcessor,
        DataModel,
        AIRecommendation,
        PDFGenerator,
        ChartManager,
        View,
        Controller
    };

})();