
// 즐겨찾기 메뉴 저장
let favorites = JSON.parse(localStorage.getItem('mealFavorites')) || [];

// 영양소 정보 데이터베이스 (예시 데이터)
const nutritionDB = {
    '쌀밥': { calories: 130, carb: 28, protein: 2.5, fat: 0.3 },
    '현미밥': { calories: 112, carb: 23, protein: 2.3, fat: 0.9 },
    '김치찌개': { calories: 45, carb: 6, protein: 3, fat: 1.5 },
    '된장찌개': { calories: 35, carb: 4, protein: 2.5, fat: 1 },
    '불고기': { calories: 156, carb: 5, protein: 15, fat: 8 },
    '갈비찜': { calories: 180, carb: 8, protein: 18, fat: 9 },
    '닭볶음탕': { calories: 140, carb: 7, protein: 16, fat: 6 },
    '생선구이': { calories: 120, carb: 0, protein: 20, fat: 4 },
    '계란말이': { calories: 154, carb: 1, protein: 11, fat: 11 },
    '시금치나물': { calories: 15, carb: 2, protein: 2, fat: 0.2 },
    '콩나물무침': { calories: 25, carb: 3, protein: 3, fat: 0.5 },
    '김치': { calories: 15, carb: 3, protein: 1, fat: 0.1 },
    '미역국': { calories: 20, carb: 2, protein: 1.5, fat: 0.5 },
    '우유': { calories: 60, carb: 5, protein: 3, fat: 3.5 }
};

document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.getElementById('searchBtn');
    const mealDateInput = document.getElementById('mealDate');
    
    // 오늘 날짜로 초기화
    const today = new Date();
    mealDateInput.value = today.toISOString().split('T')[0];
    
    // 페이지 로드 시 오늘 급식 정보 자동 조회
    searchMealInfo();
    
    // 즐겨찾기 목록 표시
    displayFavorites();
    
    searchBtn.addEventListener('click', searchMealInfo);
    mealDateInput.addEventListener('change', searchMealInfo);
});

async function searchMealInfo() {
    const mealDate = document.getElementById('mealDate').value;
    if (!mealDate) {
        alert('날짜를 선택해주세요.');
        return;
    }
    
    const formattedDate = mealDate.replace(/-/g, '');
    showLoading(true);
    hideError();
    
    try {
        // CORS 우회를 위한 프록시 사용
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=J10&SD_SCHUL_CODE=7530475&MLSV_YMD=${formattedDate}`)}`;
        
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        if (data.contents) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data.contents, "text/xml");
            
            const mealInfo = xmlDoc.querySelector('row');
            if (mealInfo) {
                const dishName = mealInfo.querySelector('DDISH_NM')?.textContent || '';
                displayMealInfo(dishName, mealDate);
            } else {
                throw new Error('해당 날짜의 급식정보가 없습니다.');
            }
        } else {
            throw new Error('급식정보를 가져올 수 없습니다.');
        }
    } catch (error) {
        console.error('급식정보 조회 중 오류 발생:', error);
        showError();
    } finally {
        showLoading(false);
    }
}

function displayMealInfo(dishName, date) {
    const mealInfoDiv = document.getElementById('mealInfo');
    const mealDateSpan = document.getElementById('mealDate');
    const menuList = document.getElementById('menuList');
    
    // 날짜 표시
    const formattedDate = new Date(date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    mealDateSpan.textContent = `${formattedDate} 급식`;
    
    // 메뉴 정리 및 표시
    const menuItems = dishName.split('<br/>').filter(item => item.trim() !== '');
    menuList.innerHTML = '';
    
    let totalCalories = 0;
    let totalCarb = 0;
    let totalProtein = 0;
    let totalFat = 0;
    
    menuItems.forEach(item => {
        const cleanItem = item.replace(/\([^)]*\)/g, '').trim();
        const li = document.createElement('li');
        
        // 영양소 정보 계산
        const nutrition = getNutritionInfo(cleanItem);
        totalCalories += nutrition.calories;
        totalCarb += nutrition.carb;
        totalProtein += nutrition.protein;
        totalFat += nutrition.fat;
        
        li.innerHTML = `
            <div class="menu-item">
                <strong>${cleanItem}</strong>
                <small>${nutrition.calories} kcal</small>
            </div>
            <button class="heart-btn ${favorites.includes(cleanItem) ? 'active' : ''}" 
                    onclick="toggleFavorite('${cleanItem}')">♥</button>
        `;
        menuList.appendChild(li);
    });
    
    // 총 칼로리 및 영양소 표시
    document.getElementById('totalCalories').textContent = `${Math.round(totalCalories)} kcal`;
    document.getElementById('carbValue').textContent = `${Math.round(totalCarb)}g`;
    document.getElementById('proteinValue').textContent = `${Math.round(totalProtein)}g`;
    document.getElementById('fatValue').textContent = `${Math.round(totalFat)}g`;
    
    // 영양소 차트 그리기
    drawNutritionChart(totalCarb, totalProtein, totalFat);
    
    mealInfoDiv.style.display = 'block';
}

function getNutritionInfo(menuItem) {
    // 메뉴 이름에서 키워드 매칭
    for (const [key, nutrition] of Object.entries(nutritionDB)) {
        if (menuItem.includes(key)) {
            return nutrition;
        }
    }
    
    // 기본값 (매칭되지 않는 경우)
    return { calories: 80, carb: 12, protein: 4, fat: 2 };
}

function drawNutritionChart(carb, protein, fat) {
    const canvas = document.getElementById('nutritionChart');
    const ctx = canvas.getContext('2d');
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;
    
    const total = carb + protein + fat;
    if (total === 0) return;
    
    let currentAngle = -Math.PI / 2;
    
    // 배경 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 탄수화물
    const carbAngle = (carb / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + carbAngle);
    ctx.lineTo(centerX, centerY);
    ctx.fillStyle = '#4ecdc4';
    ctx.fill();
    currentAngle += carbAngle;
    
    // 단백질
    const proteinAngle = (protein / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + proteinAngle);
    ctx.lineTo(centerX, centerY);
    ctx.fillStyle = '#ffe66d';
    ctx.fill();
    currentAngle += proteinAngle;
    
    // 지방
    const fatAngle = (fat / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + fatAngle);
    ctx.lineTo(centerX, centerY);
    ctx.fillStyle = '#ff6b6b';
    ctx.fill();
}

function toggleFavorite(menuItem) {
    const index = favorites.indexOf(menuItem);
    if (index === -1) {
        favorites.push(menuItem);
    } else {
        favorites.splice(index, 1);
    }
    
    localStorage.setItem('mealFavorites', JSON.stringify(favorites));
    displayFavorites();
    
    // 하트 버튼 상태 업데이트
    const heartBtns = document.querySelectorAll('.heart-btn');
    heartBtns.forEach(btn => {
        const menuText = btn.previousElementSibling.querySelector('strong').textContent;
        if (menuText === menuItem) {
            btn.classList.toggle('active', favorites.includes(menuItem));
        }
    });
}

function displayFavorites() {
    const favoritesList = document.getElementById('favoritesList');
    favoritesList.innerHTML = '';
    
    if (favorites.length === 0) {
        favoritesList.innerHTML = '<li style="text-align: center; color: #999;">즐겨찾는 메뉴가 없습니다.</li>';
        return;
    }
    
    favorites.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>❤️ ${item}</span>
            <button class="remove-favorite" onclick="removeFavorite('${item}')">×</button>
        `;
        favoritesList.appendChild(li);
    });
}

function removeFavorite(menuItem) {
    const index = favorites.indexOf(menuItem);
    if (index !== -1) {
        favorites.splice(index, 1);
        localStorage.setItem('mealFavorites', JSON.stringify(favorites));
        displayFavorites();
        
        // 하트 버튼 상태 업데이트
        const heartBtns = document.querySelectorAll('.heart-btn');
        heartBtns.forEach(btn => {
            const menuText = btn.previousElementSibling.querySelector('strong').textContent;
            if (menuText === menuItem) {
                btn.classList.remove('active');
            }
        });
    }
}

function showLoading(show) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const mealInfo = document.getElementById('mealInfo');
    
    if (show) {
        loadingSpinner.style.display = 'block';
        mealInfo.style.display = 'none';
    } else {
        loadingSpinner.style.display = 'none';
    }
}

function showError() {
    const errorMessage = document.getElementById('errorMessage');
    const mealInfo = document.getElementById('mealInfo');
    
    errorMessage.style.display = 'block';
    mealInfo.style.display = 'none';
}

function hideError() {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.style.display = 'none';
}
