// app.js
let tg = window.Telegram.WebApp;
let selectedDates = [];
let uploadedPhotos = [];

// Инициализация Telegram WebApp
tg.expand();
tg.enableClosingConfirmation();

// Получаем данные пользователя из Telegram
const user = tg.initDataUnsafe?.user;
if (user) {
    if (user.first_name) {
        document.getElementById('name').value = user.first_name + (user.last_name ? ' ' + user.last_name : '');
    }
    if (user.username) {
        document.getElementById('contact').value = '@' + user.username;
    }
}

// Обработка загрузки файлов
document.getElementById('fileUpload').addEventListener('click', () => {
    document.getElementById('photoInput').click();
});

document.getElementById('photoInput').addEventListener('change', handleFileSelect);

// Drag and drop
const fileUpload = document.getElementById('fileUpload');
fileUpload.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUpload.style.borderColor = 'var(--accent)';
    fileUpload.style.background = 'rgba(192, 122, 48, 0.1)';
});

fileUpload.addEventListener('dragleave', () => {
    fileUpload.style.borderColor = 'var(--border)';
    fileUpload.style.background = 'rgba(255,255,255,0.01)';
});

fileUpload.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUpload.style.borderColor = 'var(--border)';
    fileUpload.style.background = 'rgba(255,255,255,0.01)';
    handleFiles(e.dataTransfer.files);
});

function handleFileSelect(e) {
    handleFiles(e.target.files);
}

function handleFiles(files) {
    if (uploadedPhotos.length + files.length > 5) {
        showError('Максимум 5 фото!');
        return;
    }

    for (let file of files) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedPhotos.push({
                    data: e.target.result,
                    name: file.name,
                    type: file.type
                });
                updatePhotoPreview();
            };
            reader.readAsDataURL(file);
        }
    }
}

function updatePhotoPreview() {
    const preview = document.getElementById('photoPreview');
    preview.innerHTML = '';

    uploadedPhotos.forEach((photo, index) => {
        const div = document.createElement('div');
        div.className = 'photo-item';
        div.innerHTML = `
            <img src="${photo.data}" alt="Preview">
            <button type="button" class="remove-photo" onclick="removePhoto(${index})">×</button>
        `;
        preview.appendChild(div);
    });
}

function removePhoto(index) {
    uploadedPhotos.splice(index, 1);
    updatePhotoPreview();
}

function addDate() {
    const dateInput = document.getElementById('dates');
    const date = dateInput.value.trim();
    
    if (date && isValidDate(date)) {
        if (!selectedDates.includes(date)) {
            selectedDates.push(date);
            updateDateList();
        }
        dateInput.value = '';
        hideError('datesError');
    } else {
        showError('datesError', 'Введите дату в формате ДД.ММ.ГГГГ');
    }
}

function isValidDate(dateString) {
    const regex = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
    if (!regex.test(dateString)) return false;
    
    const [_, day, month, year] = dateString.match(regex);
    const date = new Date(year, month - 1, day);
    return date.getDate() == day && date.getMonth() == month - 1 && date.getFullYear() == year;
}

function updateDateList() {
    const dateList = document.getElementById('dateList');
    dateList.innerHTML = selectedDates.map((date, index) => `
        <span class="date-tag">
            ${date}
            <button type="button" class="remove-date" onclick="removeDate(${index})">×</button>
        </span>
    `).join('');
}

function removeDate(index) {
    selectedDates.splice(index, 1);
    updateDateList();
}

function showError(fieldId, message) {
    const errorElement = document.getElementById(fieldId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function hideError(fieldId) {
    const errorElement = document.getElementById(fieldId);
    errorElement.style.display = 'none';
}

function showNotification(message, type = 'error') {
    // Можно добавить красивые уведомления
    alert(message);
}

// Обработка отправки формы
document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        name: document.getElementById('name').value.trim(),
        contact: document.getElementById('contact').value.trim(),
        description: document.getElementById('description').value.trim(),
        dates: selectedDates.join(', '),
        source: document.getElementById('source').value,
        photos: uploadedPhotos,
        user_id: user?.id,
        username: user?.username
    };

    // Валидация
    let isValid = true;

    if (!formData.name) {
        showError('nameError', 'Пожалуйста, введите ваше имя');
        isValid = false;
    } else {
        hideError('nameError');
    }

    if (!formData.contact) {
        showError('contactError', 'Пожалуйста, укажите контакт');
        isValid = false;
    } else {
        hideError('contactError');
    }

    if (!formData.description || formData.description.length < 10) {
        showError('descriptionError', 'Опишите татуировку подробнее (минимум 10 символов)');
        isValid = false;
    } else {
        hideError('descriptionError');
    }

    if (selectedDates.length === 0) {
        showError('datesError', 'Пожалуйста, укажите хотя бы одну дату');
        isValid = false;
    } else {
        hideError('datesError');
    }

    if (!isValid) {
        return;
    }

    // Показываем загрузку
    document.getElementById('bookingForm').style.display = 'none';
    document.getElementById('loading').style.display = 'block';

    try {
        // Отправляем данные в бота через Telegram WebApp
        tg.sendData(JSON.stringify({
            action: 'create_lead',
            data: formData
        }));

        // Показываем успех
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('successMessage').style.display = 'block';
            
            // Закрываем WebApp через 3 секунды
            setTimeout(() => {
                tg.close();
            }, 3000);
        }, 2000);

    } catch (error) {
        console.error('Error:', error);
        showNotification('Ошибка при отправке заявки. Попробуйте еще раз.');
        document.getElementById('loading').style.display = 'none';
        document.getElementById('bookingForm').style.display = 'block';
    }
});

// Обработка данных от бота (если нужно)
tg.onEvent('webAppDataReceived', (event) => {
    console.log('Data received from bot:', event);
});
