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
        },
        RECURRING_TYPES: {
            daily: { name: '매일', icon: '📅', interval: 1 },
            weekly: { name: '매주', icon: '📆', interval: 7 },
            monthly: { name: '매월', icon: '🗓️', interval: 30 },
            yearly: { name: '매년', icon: '🎯', interval: 365 }
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
        addGoal(text, category, recurring = null) {
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
                reminders: [],
                recurring: recurring ? {
                    type: recurring.type,
                    interval: recurring.interval,
                    nextDue: recurring.nextDue || this.calculateNextDueDate(recurring.type),
                    completedDates: [],
                    totalCompletions: 0,
                    isActive: true
                } : null
            };

            this.state.currentProfile.bucketList.push(goal);
            this.saveProfiles();
            return goal;
        },

        // 다음 반복 날짜 계산
        calculateNextDueDate(recurringType) {
            const now = new Date();
            const config = CONFIG.RECURRING_TYPES[recurringType];
            if (!config) return null;

            const nextDate = new Date(now);
            switch (recurringType) {
                case 'daily':
                    nextDate.setDate(nextDate.getDate() + 1);
                    break;
                case 'weekly':
                    nextDate.setDate(nextDate.getDate() + 7);
                    break;
                case 'monthly':
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    break;
                case 'yearly':
                    nextDate.setFullYear(nextDate.getFullYear() + 1);
                    break;
            }
            return nextDate.toISOString();
        },

        // 반복 목표 완료 처리
        completeRecurringGoal(goalId) {
            const goal = this.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal || !goal.recurring) return null;

            const today = new Date().toISOString().split('T')[0];
            
            // 이미 오늘 완료했는지 확인
            if (goal.recurring.completedDates.includes(today)) {
                return null; // 이미 완료됨
            }

            // 완료 정보 업데이트
            goal.recurring.completedDates.push(today);
            goal.recurring.totalCompletions = (goal.recurring.totalCompletions || 0) + 1;
            goal.recurring.nextDue = this.calculateNextDueDate(goal.recurring.type);
            
            // 목표는 완료하지 않고 계속 활성 상태 유지
            goal.completed = false;
            
            this.saveProfiles();
            return goal;
        },

        // 반복 목표 비활성화
        deactivateRecurringGoal(goalId) {
            const goal = this.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal || !goal.recurring) return null;

            goal.recurring.isActive = false;
            goal.completed = true;
            goal.completedAt = new Date().toISOString();
            
            this.saveProfiles();
            return goal;
        },

        // 오늘 완료 가능한 반복 목표 확인
        canCompleteToday(goalId) {
            const goal = this.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal || !goal.recurring) return false;

            const today = new Date().toISOString().split('T')[0];
            return !goal.recurring.completedDates.includes(today);
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

        // 달성 카드 생성 (Canvas API 사용)
        async generateAchievementCard(goal, profileName) {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                canvas.width = 800;
                canvas.height = 600;
                const ctx = canvas.getContext('2d');

                // 배경 그라데이션 (Apple 스타일)
                const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                gradient.addColorStop(0, '#007AFF');
                gradient.addColorStop(1, '#5856D6');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // 배경 패턴 (선택사항)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                for (let i = 0; i < 20; i++) {
                    ctx.beginPath();
                    ctx.arc(
                        Math.random() * canvas.width,
                        Math.random() * canvas.height,
                        Math.random() * 40 + 10,
                        0,
                        2 * Math.PI
                    );
                    ctx.fill();
                }

                // 텍스트 설정
                ctx.textAlign = 'center';
                ctx.fillStyle = 'white';

                // 제목
                ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.fillText('🎉 목표 달성!', canvas.width / 2, 120);

                // 목표 텍스트
                ctx.font = '32px -apple-system, BlinkMacSystemFont, sans-serif';
                const goalText = goal.text;
                if (goalText.length > 30) {
                    const words = goalText.split(' ');
                    const lines = [];
                    let currentLine = '';
                    
                    words.forEach(word => {
                        if ((currentLine + word).length < 30) {
                            currentLine += word + ' ';
                        } else {
                            lines.push(currentLine.trim());
                            currentLine = word + ' ';
                        }
                    });
                    lines.push(currentLine.trim());
                    
                    lines.forEach((line, index) => {
                        ctx.fillText(line, canvas.width / 2, 200 + (index * 40));
                    });
                } else {
                    ctx.fillText(goalText, canvas.width / 2, 200);
                }

                // 달성일
                ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.fillText(`달성일: ${Utils.formatDate(goal.completedAt)}`, canvas.width / 2, 320);

                // 완료 메모
                if (goal.completionNote) {
                    ctx.font = 'italic 20px -apple-system, BlinkMacSystemFont, sans-serif';
                    ctx.fillText(`"${goal.completionNote}"`, canvas.width / 2, 380);
                }

                // 카테고리 배지
                const category = CONFIG.CATEGORIES[goal.category];
                if (category) {
                    ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
                    ctx.fillText(`${category.icon} ${category.name}`, canvas.width / 2, 450);
                }

                // 사용자 이름
                ctx.font = '18px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillText(`- ${profileName} -`, canvas.width / 2, 520);

                // 하단 브랜딩
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.fillText('Made with 🤍 by 버킷드림', canvas.width / 2, 570);

                resolve(canvas.toDataURL('image/png', 0.9));
            });
        },

        // 통계 카드 생성
        async generateStatsCard(profileName, stats) {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                canvas.width = 800;
                canvas.height = 600;
                const ctx = canvas.getContext('2d');

                // 배경 그라데이션
                const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                gradient.addColorStop(0, '#34C759');
                gradient.addColorStop(1, '#30D158');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // 제목
                ctx.textAlign = 'center';
                ctx.fillStyle = 'white';
                ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.fillText('📊 나의 버킷리스트', canvas.width / 2, 80);

                // 통계 정보
                ctx.font = '32px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.fillText(`총 ${stats.total}개의 목표`, canvas.width / 2, 160);
                ctx.fillText(`${stats.completed}개 완료`, canvas.width / 2, 220);
                ctx.fillText(`${stats.percentage}% 달성률`, canvas.width / 2, 280);

                // 진행률 바
                const barWidth = 500;
                const barHeight = 20;
                const barX = (canvas.width - barWidth) / 2;
                const barY = 320;

                // 배경 바
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(barX, barY, barWidth, barHeight);

                // 진행률 바
                ctx.fillStyle = 'white';
                ctx.fillRect(barX, barY, (barWidth * stats.percentage) / 100, barHeight);

                // 카테고리별 통계
                ctx.font = '20px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.fillText('카테고리별 현황', canvas.width / 2, 400);

                // 사용자 이름
                ctx.font = '18px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillText(`- ${profileName} -`, canvas.width / 2, 520);

                // 하단 브랜딩
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.fillText('Made with 🤍 by 버킷드림', canvas.width / 2, 570);

                resolve(canvas.toDataURL('image/png', 0.9));
            });
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
            
            // 새 목표 플래그 초기화
            if (this.newGoalId) {
                setTimeout(() => {
                    this.newGoalId = null;
                }, 500);
            }
        },
        
        // 인라인 완료 처리
        handleInlineComplete(goalId) {
            if (confirm('이 목표를 완료하셨나요? 🎉')) {
                this.handleGoalComplete(goalId);
            }
        },
        
        // 목표일 설정 모달
        handleScheduleModal(goalId) {
            const modal = document.createElement('div');
            modal.className = 'modal schedule-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>목표 달성 예정일 설정</h3>
                    
                    <div class="date-input-group">
                        <label for="targetDate">목표 달성 예정일</label>
                        <input type="date" id="targetDate" min="${new Date().toISOString().split('T')[0]}">
                    </div>
                    
                    <div class="date-input-group">
                        <label for="milestoneDate">중간 점검일 (선택)</label>
                        <input type="date" id="milestoneDate">
                    </div>
                    
                    <div class="reminder-options">
                        <h4>알림 설정</h4>
                        <div class="reminder-checkbox">
                            <input type="checkbox" id="reminder7days">
                            <label for="reminder7days">7일 전 알림</label>
                        </div>
                        <div class="reminder-checkbox">
                            <input type="checkbox" id="reminder1day">
                            <label for="reminder1day">1일 전 알림</label>
                        </div>
                    </div>
                    
                    <div class="modal-buttons">
                        <button class="btn-primary" onclick="Controller.saveSchedule('${goalId}')">저장</button>
                        <button class="btn-secondary" onclick="Controller.closeModal()">취소</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            modal.style.display = 'flex';
        },
        
        // 일정 저장
        saveSchedule(goalId) {
            const targetDate = document.getElementById('targetDate').value;
            const milestoneDate = document.getElementById('milestoneDate').value;
            const reminder7days = document.getElementById('reminder7days').checked;
            const reminder1day = document.getElementById('reminder1day').checked;
            
            if (!targetDate) {
                View.showNotification('목표 달성 예정일을 설정해주세요.', 'warning');
                return;
            }
            
            // 목표 업데이트
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (goal) {
                goal.targetDate = targetDate;
                goal.milestoneDate = milestoneDate;
                goal.reminders = {
                    reminder7days,
                    reminder1day
                };
                
                DataModel.saveProfiles();
                this.render();
                this.closeModal();
                View.showNotification('목표일이 설정되었습니다!', 'success');
            }
        },
        
        // 더보기 메뉴 표시
        handleMoreMenu(goalId, button) {
            // 기존 메뉴 제거
            const existingMenu = document.querySelector('.context-menu');
            if (existingMenu) {
                existingMenu.remove();
            }
            
            const menu = document.createElement('div');
            menu.className = 'context-menu';
            menu.innerHTML = `
                <button onclick="Controller.handleGoalEdit('${goalId}')">
                    ✏️ 세부사항 편집
                </button>
                <button onclick="Controller.duplicateGoal('${goalId}')">
                    📋 복제하기
                </button>
                <hr>
                <button class="danger" onclick="Controller.confirmGoalDelete('${goalId}')">
                    🗑️ 삭제하기
                </button>
            `;
            
            document.body.appendChild(menu);
            this.positionContextMenu(menu, button);
            
            // 외부 클릭 시 메뉴 닫기
            setTimeout(() => {
                document.addEventListener('click', (e) => {
                    if (!menu.contains(e.target) && e.target !== button) {
                        menu.remove();
                    }
                }, { once: true });
            }, 100);
        },
        
        // 컨텍스트 메뉴 위치 조정
        positionContextMenu(menu, button) {
            const rect = button.getBoundingClientRect();
            const menuHeight = menu.offsetHeight;
            const menuWidth = menu.offsetWidth;
            
            let top = rect.bottom + 8;
            let left = rect.left;
            
            if (top + menuHeight > window.innerHeight) {
                top = rect.top - menuHeight - 8;
            }
            
            if (left + menuWidth > window.innerWidth) {
                left = rect.right - menuWidth;
            }
            
            menu.style.position = 'fixed';
            menu.style.top = `${top}px`;
            menu.style.left = `${left}px`;
        },
        
        // 목표 복제
        duplicateGoal(goalId) {
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (goal) {
                const duplicatedGoal = {
                    ...goal,
                    id: Utils.generateId(),
                    text: goal.text + ' (복사본)',
                    completed: false,
                    createdAt: new Date().toISOString(),
                    completedAt: null,
                    completionNote: null,
                    completionEmotion: null,
                    completionImage: null,
                    emotionalJourney: [],
                    taskProgress: 0
                };
                
                DataModel.state.currentProfile.bucketList.push(duplicatedGoal);
                DataModel.saveProfiles();
                this.render();
                View.showNotification('목표가 복제되었습니다!', 'success');
            }
        },
        
        // 삭제 확인
        confirmGoalDelete(goalId) {
            if (confirm('정말로 이 목표를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
                this.handleGoalDelete(goalId);
            }
        },
        
        // 카테고리 변경
        handleCategoryChange(goalId, newCategory) {
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (goal) {
                goal.category = newCategory;
                DataModel.saveProfiles();
                this.render();
                View.showNotification('카테고리가 변경되었습니다.', 'success');
            }
        },
        
        // 모달 닫기
        closeModal() {
            const modal = document.querySelector('.modal');
            if (modal) {
                modal.remove();
            }
        },
        
        // 우선순위 드래그 앤 드롭 초기화
        initPriorityDragDrop() {
            let draggedElement = null;
            
            document.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('goal-card')) {
                    draggedElement = e.target;
                    e.target.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    
                    // 드래그 이미지 커스터마이징
                    const dragImage = e.target.cloneNode(true);
                    dragImage.style.transform = 'rotate(2deg)';
                    dragImage.style.opacity = '0.8';
                    document.body.appendChild(dragImage);
                    e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
                    setTimeout(() => dragImage.remove(), 0);
                }
            });
            
            document.addEventListener('dragend', (e) => {
                if (e.target.classList.contains('goal-card')) {
                    e.target.classList.remove('dragging');
                    this.updatePriorities();
                    this.saveGoalOrder();
                }
            });
            
            document.addEventListener('dragover', (e) => {
                if (draggedElement) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    
                    const afterElement = this.getDragAfterElement(
                        document.querySelector('.goals-grid'), 
                        e.clientY
                    );
                    
                    if (afterElement == null) {
                        document.querySelector('.goals-grid').appendChild(draggedElement);
                    } else {
                        document.querySelector('.goals-grid').insertBefore(draggedElement, afterElement);
                    }
                }
            });
            
            document.addEventListener('drop', (e) => {
                if (draggedElement) {
                    e.preventDefault();
                }
            });
        },
        
        // 드래그 후 요소 위치 계산
        getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.goal-card:not(.dragging)')];
            
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        },
        
        // 우선순위 업데이트
        updatePriorities() {
            const goalCards = document.querySelectorAll('.goal-card');
            goalCards.forEach((card, index) => {
                const goalId = card.dataset.id;
                const priorityNumber = card.querySelector('.priority-number');
                const newPriority = index + 1;
                
                if (priorityNumber) {
                    priorityNumber.textContent = newPriority;
                }
                
                // 데이터 모델 업데이트
                const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
                if (goal) {
                    goal.priority = newPriority;
                }
            });
        },
        
        // 목표 순서 저장
        saveGoalOrder() {
            DataModel.saveProfiles();
            View.showNotification('우선순위가 변경되었습니다', 'success');
        },
        
        // 진행률 위젯 렌더링
        renderProgressWidget(goal) {
            const progress = this.calculateProgress(goal);
            
            if (!progress.hasTasks && !progress.hasTargetDate) {
                return '';
            }
            
            return `
                <div class="goal-progress-widget">
                    <div class="mini-progress-bar">
                        <div class="progress-fill" style="width: ${progress.overall}%"></div>
                        ${this.renderMilestones(goal)}
                    </div>
                    <div class="progress-details">
                        <span class="progress-text">${progress.overall}% 완료</span>
                        ${progress.daysLeft !== null ? `
                            <span class="days-left ${this.getDaysLeftClass(progress.daysLeft)}">
                                ${progress.daysLeft > 0 ? `D-${progress.daysLeft}` : progress.daysLeft === 0 ? 'D-Day' : `D+${Math.abs(progress.daysLeft)}`}
                            </span>
                        ` : ''}
                    </div>
                </div>
            `;
        },
        
        // 진행률 계산
        calculateProgress(goal) {
            const tasks = goal.tasks || [];
            const completedTasks = tasks.filter(t => t.completed).length;
            const totalTasks = tasks.length;
            
            // 태스크 기반 진행률
            const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
            
            // 시간 기반 진행률 (목표일이 설정된 경우)
            let timeProgress = 0;
            if (goal.targetDate) {
                const start = new Date(goal.createdAt);
                const end = new Date(goal.targetDate);
                const now = new Date();
                
                const totalTime = end - start;
                const elapsedTime = now - start;
                
                timeProgress = Math.min((elapsedTime / totalTime) * 100, 100);
            }
            
            // 종합 진행률 (태스크와 시간의 가중평균)
            const overallProgress = goal.targetDate 
                ? (taskProgress * 0.7 + timeProgress * 0.3)
                : taskProgress;
            
            return {
                overall: Math.round(overallProgress),
                tasks: Math.round(taskProgress),
                time: Math.round(timeProgress),
                daysLeft: this.calculateDaysLeft(goal.targetDate),
                hasTasks: totalTasks > 0,
                hasTargetDate: !!goal.targetDate
            };
        },
        
        // 남은 일수 계산
        calculateDaysLeft(targetDate) {
            if (!targetDate) return null;
            
            const now = new Date();
            const target = new Date(targetDate);
            const diffTime = target - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return diffDays;
        },
        
        // 마일스톤 렌더링
        renderMilestones(goal) {
            const tasks = goal.tasks || [];
            if (tasks.length === 0) return '';
            
            const milestones = [];
            const quarterPoints = [25, 50, 75];
            
            quarterPoints.forEach(point => {
                const completedCount = tasks.filter(t => t.completed).length;
                const totalCount = tasks.length;
                const currentProgress = (completedCount / totalCount) * 100;
                
                milestones.push(`
                    <span class="milestone ${currentProgress >= point ? 'completed' : ''}" 
                          style="left: ${point}%"></span>
                `);
            });
            
            return `
                <div class="progress-milestones">
                    ${milestones.join('')}
                </div>
            `;
        },
        
        // 남은 일수 클래스 결정
        getDaysLeftClass(days) {
            if (days === null) return '';
            if (days < 0) return 'overdue';
            if (days <= 7) return 'warning';
            if (days <= 30) return 'caution';
            return 'plenty';
        },
        
        // 빠른 메모 위젯 렌더링
        renderQuickNoteWidget(goal) {
            const notes = goal.quickNotes || [];
            const noteCount = notes.length;
            
            return `
                <div class="quick-note-widget">
                    <button class="quick-note-trigger" data-goal-id="${goal.id}">
                        <span class="note-icon">📝</span>
                        ${noteCount > 0 ? `<span class="note-count">${noteCount}</span>` : ''}
                    </button>
                    
                    <div class="quick-note-panel" data-goal-id="${goal.id}">
                        <div class="note-input-wrapper">
                            <textarea 
                                class="quick-note-input" 
                                placeholder="빠른 메모 추가..."
                                rows="3"
                                data-goal-id="${goal.id}"
                            ></textarea>
                            <div class="note-actions">
                                <button class="btn-add-note" data-goal-id="${goal.id}">추가</button>
                                <button class="btn-voice-note" data-goal-id="${goal.id}">🎤</button>
                                <button class="btn-photo-note" data-goal-id="${goal.id}">📷</button>
                            </div>
                        </div>
                        
                        <div class="recent-notes">
                            ${notes.slice(0, 5).map(note => `
                                <div class="note-item" data-note-id="${note.id}">
                                    <span class="note-date">${this.formatNoteDate(note.createdAt)}</span>
                                    <span class="note-text">${Utils.escapeHtml(note.text)}</span>
                                    <button class="btn-delete-note" data-goal-id="${goal.id}" data-note-id="${note.id}">×</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        },
        
        // 메모 날짜 포맷팅
        formatNoteDate(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = now - date;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return '오늘';
            if (diffDays === 1) return '어제';
            if (diffDays < 7) return `${diffDays}일 전`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
            return `${Math.floor(diffDays / 30)}개월 전`;
        },
        
        // 빠른 메모 패널 토글
        toggleQuickNotePanel(goalId) {
            const panel = document.querySelector(`.quick-note-panel[data-goal-id="${goalId}"]`);
            if (panel) {
                panel.classList.toggle('active');
                
                // 다른 패널들 닫기
                document.querySelectorAll('.quick-note-panel').forEach(p => {
                    if (p !== panel) {
                        p.classList.remove('active');
                    }
                });
            }
        },
        
        // 빠른 메모 추가
        handleAddQuickNote(goalId) {
            const input = document.querySelector(`.quick-note-input[data-goal-id="${goalId}"]`);
            const text = input.value.trim();
            
            if (!text) {
                View.showNotification('메모 내용을 입력해주세요.', 'warning');
                return;
            }
            
            this.addQuickNote(goalId, text);
            input.value = '';
        },
        
        // 메모 추가 로직
        addQuickNote(goalId, text, type = 'text', data = null) {
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return;
            
            if (!goal.quickNotes) {
                goal.quickNotes = [];
            }
            
            const note = {
                id: Utils.generateId(),
                text: text,
                type: type,
                data: data,
                createdAt: new Date().toISOString()
            };
            
            goal.quickNotes.unshift(note);
            DataModel.saveProfiles();
            this.render();
            
            View.showNotification('메모가 추가되었습니다.', 'success');
        },
        
        // 음성 메모
        handleVoiceNote(goalId) {
            if (!('webkitSpeechRecognition' in window)) {
                View.showNotification('음성 인식이 지원되지 않는 브라우저입니다.', 'error');
                return;
            }
            
            const recognition = new webkitSpeechRecognition();
            recognition.lang = 'ko-KR';
            recognition.continuous = false;
            recognition.interimResults = false;
            
            const voiceBtn = document.querySelector(`.btn-voice-note[data-goal-id="${goalId}"]`);
            voiceBtn.classList.add('recording');
            voiceBtn.textContent = '🔴';
            
            recognition.start();
            
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const input = document.querySelector(`.quick-note-input[data-goal-id="${goalId}"]`);
                input.value = transcript;
                voiceBtn.classList.remove('recording');
                voiceBtn.textContent = '🎤';
                
                // 자동으로 메모 추가
                this.addQuickNote(goalId, transcript, 'voice');
            };
            
            recognition.onerror = () => {
                voiceBtn.classList.remove('recording');
                voiceBtn.textContent = '🎤';
                View.showNotification('음성 인식에 실패했습니다.', 'error');
            };
        },
        
        // 사진 메모
        handlePhotoNote(goalId) {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.capture = 'environment';
            
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                try {
                    const dataUrl = await this.fileToDataUrl(file);
                    this.addQuickNote(goalId, '사진 메모', 'photo', dataUrl);
                } catch (error) {
                    View.showNotification('사진 업로드에 실패했습니다.', 'error');
                }
            });
            
            fileInput.click();
        },
        
        // 파일을 DataURL로 변환
        fileToDataUrl(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },
        
        // 빠른 메모 삭제
        handleDeleteQuickNote(goalId, noteId) {
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (goal && goal.quickNotes) {
                goal.quickNotes = goal.quickNotes.filter(n => n.id !== noteId);
                DataModel.saveProfiles();
                this.render();
                View.showNotification('메모가 삭제되었습니다.', 'info');
            }
        },

        // 목표 요소 생성
        createGoalElement(goal) {
            const categoryInfo = CONFIG.CATEGORIES[goal.category] || CONFIG.CATEGORIES.other;
            const isCompleted = goal.completed;
            const hasImage = goal.completionImage;
            const hasTasks = goal.tasks && goal.tasks.length > 0;
            const hasEmotionalJourney = goal.emotionalJourney && goal.emotionalJourney.length > 0;
            const isRecurring = goal.recurring && goal.recurring.isActive;
            
            // 태스크 정보 가져오기
            const tasks = goal.tasks || [];
            const completedTasks = tasks.filter(t => t.completed).length;
            const totalTasks = tasks.length;
            const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            // 초기 감정 가져오기
            const initialEmotion = goal.emotionalJourney && goal.emotionalJourney.length > 0 
                ? goal.emotionalJourney[0].emotion 
                : null;
            
            // 반복 목표 정보 가져오기
            let recurringInfo = '';
            if (isRecurring) {
                const recurringType = CONFIG.RECURRING_TYPES[goal.recurring.type];
                const nextDue = goal.recurring.nextDue ? new Date(goal.recurring.nextDue) : null;
                const totalCompletions = goal.recurring.totalCompletions || 0;
                const isOverdue = nextDue && nextDue < new Date();
                
                recurringInfo = `
                    <div class="recurring-info">
                        <span class="recurring-badge ${isOverdue ? 'overdue' : ''}">
                            ${recurringType.icon} ${recurringType.name}
                        </span>
                        <span class="recurring-stats">
                            완료 ${totalCompletions}회
                            ${nextDue ? `· 다음: ${Utils.formatDate(nextDue)}` : ''}
                        </span>
                    </div>
                `;
            }

            return `
                <article class="goal-card ${isCompleted ? 'completed' : ''} ${this.newGoalId === goal.id ? 'new' : ''}" 
                         data-id="${goal.id}" 
                         data-category="${goal.category}"
                         ${isRecurring ? 'data-recurring="true"' : ''}
                         draggable="true">
                    <div class="drag-handle">
                        <span class="priority-number">${goal.priority || 1}</span>
                        <span class="drag-icon">⋮⋮</span>
                    </div>
                    <div class="category-bar ${goal.category}"></div>
                    
                    <div class="goal-header">
                        <div class="goal-main-info">
                            <h3 class="goal-text">${Utils.escapeHtml(goal.text)}</h3>
                            <select class="category-selector" data-goal-id="${goal.id}">
                                ${Object.entries(CONFIG.CATEGORIES).map(([key, cat]) => `
                                    <option value="${key}" ${goal.category === key ? 'selected' : ''}>
                                        ${cat.icon} ${cat.name}
                                    </option>
                                `).join('')}
                            </select>
                            ${recurringInfo}
                        </div>
                        <div class="goal-status">
                            ${!isCompleted ? `
                                <button class="btn-complete-inline" data-goal-id="${goal.id}">
                                    ${isRecurring ? '✅ 오늘 완료' : '✅ 완료'}
                                </button>
                            ` : `
                                <span class="completion-badge">🎉 완료됨</span>
                            `}
                        </div>
                    </div>
                    
                    ${hasTasks || !isCompleted ? `
                        <div class="tasks-section">
                            <div class="tasks-header">
                                <span class="tasks-title">세부 태스크 ${hasTasks ? `(${completedTasks}/${totalTasks})` : ''}</span>
                                <button class="btn-add-task btn-task" data-goal-id="${goal.id}">+ 태스크 추가</button>
                            </div>
                            
                            ${hasTasks ? `
                                <div class="task-list" data-goal-id="${goal.id}">
                                    ${tasks.map(task => `
                                        <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}" draggable="true">
                                            <div class="task-item-header">
                                                <span class="drag-handle">≡</span>
                                                <input type="checkbox" 
                                                       class="task-checkbox" 
                                                       data-goal-id="${goal.id}" 
                                                       data-task-id="${task.id}"
                                                       ${task.completed ? 'checked' : ''}>
                                                <span class="task-text">${Utils.escapeHtml(task.text)}</span>
                                                <button class="task-expand-btn ${task.notes && task.notes.length > 0 ? 'expanded' : ''}" 
                                                        data-task-id="${task.id}">▶</button>
                                                <button class="btn-delete-task" 
                                                        data-goal-id="${goal.id}" 
                                                        data-task-id="${task.id}"
                                                        title="삭제">×</button>
                                            </div>
                                            <div class="task-details ${task.notes && task.notes.length > 0 ? 'show' : ''}">
                                                <div class="task-notes">
                                                    ${task.notes ? task.notes.map(note => `
                                                        <div class="task-note" data-note-id="${note.id}">
                                                            <span class="note-date">${Utils.formatShortDate(note.date)}</span>
                                                            <span class="note-text">${Utils.escapeHtml(note.text)}</span>
                                                            <button class="btn-delete-note" 
                                                                    data-goal-id="${goal.id}" 
                                                                    data-task-id="${task.id}"
                                                                    data-note-id="${note.id}"
                                                                    title="노트 삭제">×</button>
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
                                <button class="inline-task-add" onclick="Controller.showInlineTaskAdd(this, '${goal.id}')">
                                    <span>+</span>
                                    <span>태스크 추가</span>
                                </button>
                                <div class="inline-task-add-form" data-goal-id="${goal.id}">
                                    <input type="text" class="inline-task-input" 
                                           placeholder="새 태스크 입력..." 
                                           data-goal-id="${goal.id}">
                                    <button class="task-save-btn" onclick="Controller.saveInlineTask('${goal.id}')">추가</button>
                                    <button class="task-edit-cancel-btn" onclick="Controller.cancelInlineTask('${goal.id}')">취소</button>
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
                    
                    ${this.renderProgressWidget(goal)}
                    
                    <div class="goal-actions">
                        <button class="btn-schedule" data-goal-id="${goal.id}" title="목표 달성 예정일 설정">
                            📅 목표일 설정
                        </button>
                        <button class="btn-tasks" data-goal-id="${goal.id}" title="세부 계획 관리">
                            📋 세부 계획
                        </button>
                        <button class="btn-more" data-goal-id="${goal.id}" title="추가 옵션">
                            ⋮ 더보기
                        </button>
                    </div>
                    
                    ${this.renderQuickNoteWidget(goal)}
                    
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
            
            // 더블클릭 이벤트 위임
            document.addEventListener('dblclick', this.handleDoubleClick.bind(this));
            
            // 키보드 이벤트
            document.addEventListener('keydown', this.handleKeydown.bind(this));
            
            // 폼 이벤트
            this.bindFormEvents();
            
            // 드래그 앤 드롭
            this.bindDragDropEvents();
            
            // 태스크 드래그 앤 드롭
            this.bindTaskDragEvents();
            
            // 우선순위 드래그 앤 드롭
            this.initPriorityDragDrop();
            
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
            
            // 태스크 편집 저장
            if (target.classList.contains('task-save-btn')) {
                const goalId = target.dataset.goalId;
                const taskId = target.dataset.taskId;
                this.handleTaskSave(goalId, taskId);
            }
            
            // 태스크 편집 취소
            if (target.classList.contains('task-edit-cancel-btn')) {
                const goalId = target.dataset.goalId;
                const taskId = target.dataset.taskId;
                this.handleTaskEditCancel(goalId, taskId);
            }
            
            // 노트 추가 버튼
            if (target.classList.contains('btn-add-note')) {
                const goalId = target.dataset.goalId;
                const taskId = target.dataset.taskId;
                this.handleAddNoteClick(goalId, taskId);
            }
            
            // 태스크 삭제 버튼
            if (target.classList.contains('btn-delete-task')) {
                const goalId = target.dataset.goalId;
                const taskId = target.dataset.taskId;
                this.handleTaskDelete(goalId, taskId);
            }
            
            // 노트 삭제 버튼
            if (target.classList.contains('btn-delete-note')) {
                const goalId = target.dataset.goalId;
                const taskId = target.dataset.taskId;
                const noteId = target.dataset.noteId;
                this.handleNoteDelete(goalId, taskId, noteId);
            }
            
            // 인라인 완료 버튼
            if (target.classList.contains('btn-complete-inline')) {
                const goalId = target.dataset.goalId;
                this.handleInlineComplete(goalId);
            }
            
            // 목표일 설정 버튼
            if (target.classList.contains('btn-schedule')) {
                const goalId = target.dataset.goalId;
                this.handleScheduleModal(goalId);
            }
            
            // 세부 계획 버튼
            if (target.classList.contains('btn-tasks')) {
                const goalId = target.dataset.goalId;
                this.handleTaskManager(goalId);
            }
            
            // 더보기 버튼
            if (target.classList.contains('btn-more')) {
                const goalId = target.dataset.goalId;
                this.handleMoreMenu(goalId, target);
            }
            
            // 카테고리 선택기 변경
            if (target.classList.contains('category-selector')) {
                const goalId = target.dataset.goalId;
                const newCategory = target.value;
                this.handleCategoryChange(goalId, newCategory);
            }
            
            // 빠른 메모 관련 이벤트
            if (target.classList.contains('quick-note-trigger')) {
                const goalId = target.dataset.goalId;
                this.toggleQuickNotePanel(goalId);
            }
            
            if (target.classList.contains('btn-add-note')) {
                const goalId = target.dataset.goalId;
                this.handleAddQuickNote(goalId);
            }
            
            if (target.classList.contains('btn-voice-note')) {
                const goalId = target.dataset.goalId;
                this.handleVoiceNote(goalId);
            }
            
            if (target.classList.contains('btn-photo-note')) {
                const goalId = target.dataset.goalId;
                this.handlePhotoNote(goalId);
            }
            
            if (target.classList.contains('btn-delete-note') && target.dataset.noteId) {
                const goalId = target.dataset.goalId;
                const noteId = target.dataset.noteId;
                this.handleDeleteQuickNote(goalId, noteId);
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
        
        // 더블클릭 이벤트 핸들러
        handleDoubleClick(e) {
            const target = e.target;
            
            // 태스크 텍스트 더블클릭으로 편집
            if (target.classList.contains('task-text')) {
                const taskItem = target.closest('.task-item');
                const goalId = taskItem.querySelector('.task-checkbox').dataset.goalId;
                const taskId = taskItem.querySelector('.task-checkbox').dataset.taskId;
                this.handleTaskEdit(goalId, taskId);
            }
            
            // 목표 제목 더블클릭으로 편집
            if (target.classList.contains('goal-title')) {
                const goalCard = target.closest('.goal-card');
                const goalId = goalCard.dataset.id;
                this.handleGoalTitleEdit(goalId);
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
        
        // 태스크 드래그 앤 드롭 이벤트
        bindTaskDragEvents() {
            let draggedTask = null;
            let draggedGoalId = null;
            let draggedTaskId = null;
            let dragGuide = null;
            
            // 드래그 가이드 생성
            const createDragGuide = () => {
                if (!dragGuide) {
                    dragGuide = document.createElement('div');
                    dragGuide.className = 'drag-guide';
                    document.body.appendChild(dragGuide);
                }
                return dragGuide;
            };
            
            // 이벤트 위임을 사용하여 동적 요소에도 적용
            document.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('task-item')) {
                    draggedTask = e.target;
                    draggedGoalId = e.target.closest('.task-list').dataset.goalId;
                    draggedTaskId = e.target.dataset.taskId;
                    e.target.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    
                    // 드래그 미리보기 생성
                    const preview = e.target.cloneNode(true);
                    preview.classList.add('task-drag-preview');
                    preview.style.position = 'absolute';
                    preview.style.top = '-1000px';
                    document.body.appendChild(preview);
                    e.dataTransfer.setDragImage(preview, e.offsetX, e.offsetY);
                    setTimeout(() => preview.remove(), 0);
                    
                    // 드래그 시작 시 모든 목표 카드에 드롭 가능 표시
                    document.querySelectorAll('.goal-card').forEach(card => {
                        const cardGoalId = card.querySelector('.task-list')?.dataset.goalId;
                        if (cardGoalId && cardGoalId !== draggedGoalId) {
                            card.classList.add('drop-zone-active');
                        }
                    });
                }
            });
            
            document.addEventListener('dragend', (e) => {
                if (e.target.classList.contains('task-item')) {
                    e.target.classList.remove('dragging');
                    
                    // 모든 drag-over 클래스 제거
                    document.querySelectorAll('.task-item.drag-over').forEach(item => {
                        item.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
                    });
                    
                    document.querySelectorAll('.goal-card').forEach(card => {
                        card.classList.remove('drop-zone-active', 'drag-over');
                    });
                    
                    document.querySelectorAll('.task-list').forEach(list => {
                        list.classList.remove('drop-zone-active', 'drag-over');
                    });
                    
                    // 드래그 가이드 제거
                    if (dragGuide) {
                        dragGuide.classList.remove('active');
                    }
                }
            });
            
            document.addEventListener('dragover', (e) => {
                e.preventDefault();
                
                // 태스크 위에서
                if (e.target.closest('.task-item') && draggedTask) {
                    const taskItem = e.target.closest('.task-item');
                    if (taskItem !== draggedTask) {
                        // 이전 drag-over 제거
                        document.querySelectorAll('.task-item.drag-over').forEach(item => {
                            if (item !== taskItem) item.classList.remove('drag-over');
                        });
                        
                        // 마우스 위치에 따라 위/아래 표시
                        const rect = taskItem.getBoundingClientRect();
                        const midpoint = rect.top + rect.height / 2;
                        
                        // 드래그 가이드 표시
                        const guide = createDragGuide();
                        guide.classList.add('active');
                        
                        if (e.clientY < midpoint) {
                            guide.style.top = `${rect.top - 1}px`;
                            guide.style.left = `${rect.left}px`;
                            guide.style.width = `${rect.width}px`;
                            taskItem.classList.add('drag-over', 'drag-over-top');
                        } else {
                            guide.style.top = `${rect.bottom - 1}px`;
                            guide.style.left = `${rect.left}px`;
                            guide.style.width = `${rect.width}px`;
                            taskItem.classList.add('drag-over', 'drag-over-bottom');
                        }
                    }
                }
                
                // 목표 카드 위에서
                if (e.target.closest('.goal-card') && draggedTask) {
                    const goalCard = e.target.closest('.goal-card');
                    const targetGoalId = goalCard.querySelector('.task-list')?.dataset.goalId;
                    
                    if (targetGoalId && targetGoalId !== draggedGoalId) {
                        goalCard.classList.add('drag-over');
                    }
                }
                
                // 빈 태스크 리스트 위에서
                if (e.target.closest('.task-list') && draggedTask) {
                    const taskList = e.target.closest('.task-list');
                    if (!taskList.querySelector('.task-item:not(.dragging)')) {
                        taskList.classList.add('drag-over');
                    }
                }
            });
            
            document.addEventListener('dragleave', (e) => {
                if (e.target.closest('.task-item')) {
                    const taskItem = e.target.closest('.task-item');
                    taskItem.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
                    
                    // 드래그 가이드 숨기기
                    if (dragGuide && !e.relatedTarget?.closest('.task-item')) {
                        dragGuide.classList.remove('active');
                    }
                }
                
                if (e.target.closest('.goal-card')) {
                    const goalCard = e.target.closest('.goal-card');
                    if (!goalCard.contains(e.relatedTarget)) {
                        goalCard.classList.remove('drag-over');
                    }
                }
                
                if (e.target.closest('.task-list')) {
                    const taskList = e.target.closest('.task-list');
                    if (!taskList.contains(e.relatedTarget)) {
                        taskList.classList.remove('drag-over');
                    }
                }
            });
            
            document.addEventListener('drop', (e) => {
                e.preventDefault();
                
                if (!draggedTask) return;
                
                const targetTaskList = e.target.closest('.task-list');
                if (!targetTaskList) return;
                
                const targetGoalId = targetTaskList.dataset.goalId;
                const targetTask = e.target.closest('.task-item');
                
                if (targetTask && targetTask !== draggedTask) {
                    // 특정 태스크 위치에 드롭
                    const rect = targetTask.getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;
                    
                    if (e.clientY < midpoint) {
                        targetTaskList.insertBefore(draggedTask, targetTask);
                    } else {
                        targetTaskList.insertBefore(draggedTask, targetTask.nextSibling);
                    }
                } else if (!targetTask && targetTaskList !== draggedTask.parentElement) {
                    // 빈 리스트에 드롭
                    targetTaskList.appendChild(draggedTask);
                }
                
                // 데이터 업데이트
                this.updateTaskOrder(draggedGoalId, targetGoalId, draggedTaskId);
                
                // 클래스 정리
                document.querySelectorAll('.drag-over, .drag-over-top, .drag-over-bottom').forEach(el => {
                    el.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
                });
            });
        },
        
        // 태스크 순서 업데이트
        updateTaskOrder(sourceGoalId, targetGoalId, taskId) {
            const sourceGoal = DataModel.state.currentProfile?.bucketList.find(g => g.id === sourceGoalId);
            const targetGoal = DataModel.state.currentProfile?.bucketList.find(g => g.id === targetGoalId);
            
            if (!sourceGoal || !targetGoal) return;
            
            if (sourceGoalId === targetGoalId) {
                // 같은 목표 내에서 순서만 변경된 경우
                if (sourceGoal.tasks) {
                    // DOM 순서대로 태스크 재정렬
                    const taskList = document.querySelector(`.task-list[data-goal-id="${sourceGoalId}"]`);
                    const newOrder = [...taskList.querySelectorAll('.task-item')].map(item => item.dataset.taskId);
                    
                    // 새로운 순서로 태스크 배열 재정렬
                    const orderedTasks = [];
                    newOrder.forEach(tid => {
                        const task = sourceGoal.tasks.find(t => t.id === tid);
                        if (task) orderedTasks.push(task);
                    });
                    
                    sourceGoal.tasks = orderedTasks;
                }
            } else {
                // 다른 목표로 이동하는 경우
                const task = sourceGoal.tasks?.find(t => t.id === taskId);
                if (task) {
                    // 원본에서 제거
                    sourceGoal.tasks = sourceGoal.tasks.filter(t => t.id !== taskId);
                    
                    // 대상에 추가
                    if (!targetGoal.tasks) targetGoal.tasks = [];
                    
                    // DOM 순서에 따라 삽입
                    const targetTaskList = document.querySelector(`.task-list[data-goal-id="${targetGoalId}"]`);
                    const targetTaskIds = [...targetTaskList.querySelectorAll('.task-item')].map(item => item.dataset.taskId);
                    const insertIndex = targetTaskIds.indexOf(taskId);
                    
                    if (insertIndex >= 0) {
                        targetGoal.tasks.splice(insertIndex, 0, task);
                    } else {
                        targetGoal.tasks.push(task);
                    }
                }
            }
            
            DataModel.saveProfiles();
            // 태스크 이동 후 전체 화면 업데이트
            setTimeout(() => this.render(), 100);
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
            const recurringSelect = document.getElementById('recurringSelect');
            
            if (!input || !categorySelect || !recurringSelect) return;

            const text = input.value.trim();
            const category = categorySelect.value;
            const recurringType = recurringSelect.value;

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

            // 반복 설정 처리
            let recurring = null;
            if (recurringType && CONFIG.RECURRING_TYPES[recurringType]) {
                recurring = {
                    type: recurringType,
                    interval: CONFIG.RECURRING_TYPES[recurringType].interval
                };
            }

            const newGoal = DataModel.addGoal(text, category, recurring);
            input.value = '';
            recurringSelect.value = '';
            
            // 새 목표 추가 애니메이션을 위한 플래그 설정
            this.newGoalId = newGoal.id;
            this.render();
            
            // 동기부여 메시지
            const message = recurring ? 
                `${CONFIG.RECURRING_TYPES[recurringType].name} 반복 목표가 추가되었습니다! 꾸준히 실천해보세요.` :
                AIRecommendation.getMotivationalMessage({ category });
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
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return;

            // 반복 목표 처리
            if (goal.recurring && goal.recurring.isActive) {
                if (!DataModel.canCompleteToday(goalId)) {
                    View.showNotification('오늘은 이미 완료한 목표입니다!', 'warning');
                    return;
                }
                
                // 반복 목표 완료 처리
                DataModel.completeRecurringGoal(goalId);
                const recurringType = CONFIG.RECURRING_TYPES[goal.recurring.type];
                View.showNotification(`🎉 오늘의 ${recurringType.name} 목표를 완료했습니다!`, 'success');
                this.render();
                return;
            }

            // 일반 목표 완료 처리
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

        // 목표 공유 - 향상된 버전
        handleShareGoal(goalId) {
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return;

            // 공유 옵션 모달 표시
            this.showShareModal(goal);
        },

        // 공유 모달 표시
        showShareModal(goal) {
            const modal = document.createElement('div');
            modal.className = 'share-modal';
            modal.innerHTML = `
                <div class="share-modal-content">
                    <div class="share-modal-header">
                        <h3>목표 공유하기</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="share-modal-body">
                        <div class="share-preview">
                            <h4>"${Utils.escapeHtml(goal.text)}"</h4>
                            <p>✅ 달성일: ${Utils.formatDate(goal.completedAt)}</p>
                            ${goal.completionNote ? `<p class="completion-note">"${Utils.escapeHtml(goal.completionNote)}"</p>` : ''}
                        </div>
                        <div class="share-options">
                            <button class="share-option" data-type="image" data-goal-id="${goal.id}">
                                🖼️ 이미지 카드로 공유
                            </button>
                            <button class="share-option" data-type="text" data-goal-id="${goal.id}">
                                📝 텍스트로 공유
                            </button>
                            <button class="share-option" data-type="social" data-goal-id="${goal.id}">
                                📱 소셜 미디어 공유
                            </button>
                            <button class="share-option" data-type="link" data-goal-id="${goal.id}">
                                🔗 링크 복사
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // 이벤트 리스너
            modal.querySelector('.close-btn').onclick = () => {
                document.body.removeChild(modal);
            };

            modal.onclick = (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            };

            // 공유 옵션 클릭
            modal.querySelectorAll('.share-option').forEach(btn => {
                btn.onclick = () => {
                    const type = btn.dataset.type;
                    const goalId = btn.dataset.goalId;
                    this.handleShareOption(type, goalId);
                    document.body.removeChild(modal);
                };
            });
        },

        // 공유 옵션 처리
        async handleShareOption(type, goalId) {
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (!goal) return;

            const profileName = DataModel.state.currentProfile.name;

            switch (type) {
                case 'image':
                    await this.shareAsImage(goal, profileName);
                    break;
                case 'text':
                    this.shareAsText(goal);
                    break;
                case 'social':
                    this.shareToSocial(goal);
                    break;
                case 'link':
                    this.shareAsLink(goal);
                    break;
            }
        },

        // 이미지로 공유
        async shareAsImage(goal, profileName) {
            try {
                View.showLoading('이미지 생성 중...');
                const imageDataUrl = await PDFGenerator.generateAchievementCard(goal, profileName);
                
                // 이미지 다운로드
                const link = document.createElement('a');
                link.download = `achievement-${goal.id}.png`;
                link.href = imageDataUrl;
                link.click();
                
                View.hideLoading();
                View.showNotification('이미지가 다운로드되었습니다!', 'success');
            } catch (error) {
                View.hideLoading();
                View.showNotification('이미지 생성에 실패했습니다.', 'error');
                console.error(error);
            }
        },

        // 텍스트로 공유
        shareAsText(goal) {
            const shareText = `✅ 버킷리스트 달성!\n\n"${goal.text}"\n\n${goal.completionNote || '목표를 달성했습니다!'}\n\n달성일: ${Utils.formatDate(goal.completedAt)}\n\n#버킷리스트 #목표달성 #BucketDreams`;
            
            if (navigator.share) {
                navigator.share({
                    title: '버킷리스트 달성',
                    text: shareText
                }).catch(err => console.log('공유 취소됨'));
            } else {
                navigator.clipboard.writeText(shareText)
                    .then(() => View.showNotification('클립보드에 복사되었습니다!', 'success'))
                    .catch(() => View.showNotification('복사에 실패했습니다.', 'error'));
            }
        },

        // 소셜 미디어 공유
        shareToSocial(goal) {
            const shareText = encodeURIComponent(`✅ 버킷리스트 달성! "${goal.text}" ${goal.completionNote || ''} #버킷리스트 #목표달성`);
            const shareUrl = encodeURIComponent(window.location.href);
            
            const socialModal = document.createElement('div');
            socialModal.className = 'social-share-modal';
            socialModal.innerHTML = `
                <div class="social-share-content">
                    <div class="social-share-header">
                        <h3>소셜 미디어 공유</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="social-share-body">
                        <div class="social-options">
                            <a href="https://twitter.com/intent/tweet?text=${shareText}" target="_blank" class="social-btn twitter">
                                🐦 Twitter
                            </a>
                            <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}" target="_blank" class="social-btn facebook">
                                📘 Facebook
                            </a>
                            <a href="https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}" target="_blank" class="social-btn linkedin">
                                💼 LinkedIn
                            </a>
                            <a href="https://api.whatsapp.com/send?text=${shareText}" target="_blank" class="social-btn whatsapp">
                                💬 WhatsApp
                            </a>
                            <button class="social-btn copy" data-text="${decodeURIComponent(shareText)}">
                                📋 복사하기
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(socialModal);

            // 이벤트 리스너
            socialModal.querySelector('.close-btn').onclick = () => {
                document.body.removeChild(socialModal);
            };

            socialModal.onclick = (e) => {
                if (e.target === socialModal) {
                    document.body.removeChild(socialModal);
                }
            };

            // 복사 버튼
            socialModal.querySelector('.copy').onclick = () => {
                const text = socialModal.querySelector('.copy').dataset.text;
                navigator.clipboard.writeText(text)
                    .then(() => {
                        View.showNotification('클립보드에 복사되었습니다!', 'success');
                        document.body.removeChild(socialModal);
                    })
                    .catch(() => View.showNotification('복사에 실패했습니다.', 'error'));
            };
        },

        // 링크로 공유
        shareAsLink(goal) {
            const shareUrl = `${window.location.origin}${window.location.pathname}?shared=${goal.id}`;
            
            navigator.clipboard.writeText(shareUrl)
                .then(() => View.showNotification('링크가 클립보드에 복사되었습니다!', 'success'))
                .catch(() => View.showNotification('링크 복사에 실패했습니다.', 'error'));
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
        
        // 목표 제목 인라인 편집
        handleGoalTitleEdit(goalId) {
            const titleElement = document.querySelector(`.goal-card[data-id="${goalId}"] .goal-title`);
            if (!titleElement) return;
            
            const currentText = titleElement.textContent;
            const originalHTML = titleElement.innerHTML;
            
            // 입력 필드 생성
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentText;
            input.className = 'goal-title-edit-input';
            
            // 스타일 복사
            const styles = window.getComputedStyle(titleElement);
            input.style.fontSize = styles.fontSize;
            input.style.fontWeight = styles.fontWeight;
            input.style.width = '100%';
            
            // 제목 요소를 입력 필드로 교체
            titleElement.innerHTML = '';
            titleElement.appendChild(input);
            
            // 포커스 및 전체 선택
            input.focus();
            input.select();
            
            // 저장 함수
            const saveEdit = () => {
                const newText = input.value.trim();
                if (newText && newText !== currentText) {
                    const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
                    if (goal) {
                        goal.text = newText;
                        DataModel.saveProfiles();
                        View.showNotification('목표가 수정되었습니다.', 'success');
                    }
                }
                this.render();
            };
            
            // 취소 함수
            const cancelEdit = () => {
                titleElement.innerHTML = originalHTML;
            };
            
            // 이벤트 리스너
            input.addEventListener('blur', saveEdit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveEdit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    input.removeEventListener('blur', saveEdit);
                    cancelEdit();
                }
            });
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
        
        // 태스크 편집 모드 진입
        handleTaskEdit(goalId, taskId) {
            const taskItem = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
            if (!taskItem) return;
            
            const taskText = taskItem.querySelector('.task-text');
            const currentText = taskText.textContent;
            
            // 편집 UI로 변경
            taskText.innerHTML = `
                <input type="text" class="task-edit-input" value="${Utils.escapeHtml(currentText)}" 
                       data-goal-id="${goalId}" data-task-id="${taskId}">
                <div class="task-edit-actions">
                    <button class="task-save-btn" data-goal-id="${goalId}" data-task-id="${taskId}">저장</button>
                    <button class="task-edit-cancel-btn" data-goal-id="${goalId}" data-task-id="${taskId}">취소</button>
                </div>
            `;
            
            // 입력 필드에 포커스
            const input = taskText.querySelector('.task-edit-input');
            input.focus();
            input.select();
            
            // 엔터 키로 저장
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleTaskSave(goalId, taskId);
                } else if (e.key === 'Escape') {
                    this.handleTaskEditCancel(goalId, taskId);
                }
            });
        },
        
        // 태스크 저장
        handleTaskSave(goalId, taskId) {
            const input = document.querySelector(`.task-edit-input[data-task-id="${taskId}"]`);
            if (!input) return;
            
            const newText = input.value.trim();
            if (!newText) {
                View.showNotification('태스크 내용을 입력해주세요.', 'warning');
                return;
            }
            
            // 데이터 업데이트
            const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
            if (goal && goal.tasks) {
                const task = goal.tasks.find(t => t.id === taskId);
                if (task) {
                    task.text = newText;
                    DataModel.saveProfiles();
                    this.render();
                    View.showNotification('태스크가 수정되었습니다.', 'success');
                }
            }
        },
        
        // 태스크 편집 취소
        handleTaskEditCancel(goalId, taskId) {
            this.render(); // 전체 다시 렌더링하여 원래 상태로 복구
        },
        
        // 태스크 삭제
        handleTaskDelete(goalId, taskId) {
            if (!confirm('이 태스크를 삭제하시겠습니까?')) return;
            
            // 삭제 애니메이션 적용
            const taskElement = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
            if (taskElement) {
                taskElement.classList.add('deleting');
                
                // 애니메이션 종료 후 실제 삭제
                setTimeout(() => {
                    const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
                    if (goal && goal.tasks) {
                        goal.tasks = goal.tasks.filter(t => t.id !== taskId);
                        DataModel.saveProfiles();
                        this.render();
                        View.showNotification('태스크가 삭제되었습니다.', 'info');
                    }
                }, 300);
            } else {
                // 요소를 찾을 수 없는 경우 즉시 삭제
                const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
                if (goal && goal.tasks) {
                    goal.tasks = goal.tasks.filter(t => t.id !== taskId);
                    DataModel.saveProfiles();
                    this.render();
                    View.showNotification('태스크가 삭제되었습니다.', 'info');
                }
            }
        },
        
        // 노트 삭제
        handleNoteDelete(goalId, taskId, noteId) {
            // 삭제 애니메이션 적용
            const noteElement = document.querySelector(`.note-item[data-note-id="${noteId}"]`);
            if (noteElement) {
                noteElement.classList.add('deleting');
                
                // 애니메이션 종료 후 실제 삭제
                setTimeout(() => {
                    const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
                    if (goal && goal.tasks) {
                        const task = goal.tasks.find(t => t.id === taskId);
                        if (task && task.notes) {
                            task.notes = task.notes.filter(n => n.id !== noteId);
                            DataModel.saveProfiles();
                            this.render();
                            View.showNotification('노트가 삭제되었습니다.', 'info');
                        }
                    }
                }, 300);
            } else {
                // 요소를 찾을 수 없는 경우 즉시 삭제
                const goal = DataModel.state.currentProfile?.bucketList.find(g => g.id === goalId);
                if (goal && goal.tasks) {
                    const task = goal.tasks.find(t => t.id === taskId);
                    if (task && task.notes) {
                        task.notes = task.notes.filter(n => n.id !== noteId);
                        DataModel.saveProfiles();
                        this.render();
                        View.showNotification('노트가 삭제되었습니다.', 'info');
                    }
                }
            }
        },

        // 인라인 태스크 추가 표시
        showInlineTaskAdd(button, goalId) {
            button.style.display = 'none';
            const form = document.querySelector(`.inline-task-add-form[data-goal-id="${goalId}"]`);
            form.classList.add('show');
            const input = form.querySelector('.inline-task-input');
            input.focus();
            
            // Enter 키로 저장
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.saveInlineTask(goalId);
                } else if (e.key === 'Escape') {
                    this.cancelInlineTask(goalId);
                }
            });
        },
        
        // 인라인 태스크 저장
        saveInlineTask(goalId) {
            const form = document.querySelector(`.inline-task-add-form[data-goal-id="${goalId}"]`);
            const input = form.querySelector('.inline-task-input');
            const taskText = input.value.trim();
            
            if (!taskText) {
                View.showNotification('태스크를 입력해주세요.', 'warning');
                return;
            }
            
            // 태스크 추가
            const taskData = {
                text: taskText,
                priority: 'medium'
            };
            
            DataModel.addTask(goalId, taskData);
            
            // UI 초기화
            input.value = '';
            form.classList.remove('show');
            const addButton = form.previousElementSibling;
            if (addButton) addButton.style.display = 'flex';
            
            this.render();
            View.showNotification('태스크가 추가되었습니다.', 'success');
        },
        
        // 인라인 태스크 추가 취소
        cancelInlineTask(goalId) {
            const form = document.querySelector(`.inline-task-add-form[data-goal-id="${goalId}"]`);
            const input = form.querySelector('.inline-task-input');
            
            input.value = '';
            form.classList.remove('show');
            const addButton = form.previousElementSibling;
            if (addButton) addButton.style.display = 'flex';
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