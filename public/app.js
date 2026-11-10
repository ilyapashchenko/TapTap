// ПЕРЕМЕННЫЕ
let currentBookingPlaceId = null;
let selectedMaster = null;
let selectedServices = [];
let selectedDate = null;
let totalDuration = 0;
let selectedSlot = null;
let bookingDuration = 0;
let handleOutsideClick;
let selectedTime = null;
let userRole = null;


// ОПРЕДЕЛЕНИЕ РОЛИ
async function getUserRoleOnce() {
  if (userRole !== null) return userRole;

  const initData = window.Telegram.WebApp.initData;
  const response = await fetch('/api/getUserRole', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData })
  });

  const data = await response.json();
  if (data.success) {
    userRole = data.role;

    // ✅ Применяем стили в зависимости от роли
    if (userRole === 'staff') {
      document.body.classList.add('role-master');
    } else if (userRole === 'client') {
      document.body.classList.add('role-user');
    }

    console.log('🎭 Роль пользователя:', userRole);
  }
  else {
    console.warn('❌ Не удалось получить роль:', data.error || 'unknown');
    userRole = 'unknown';
  }

  return userRole;
}

// QR КОД












window.Telegram.WebApp.ready();

document.addEventListener('DOMContentLoaded', async () => {
  window.Telegram.WebApp.expand();
  const initData = window.Telegram.WebApp.initData;
  const initDataUnsafe = window.Telegram.WebApp.initDataUnsafe;
  const startParam = initDataUnsafe?.start_param;

  console.log('[DEBUG] startParam:', startParam);

  if (startParam?.startsWith('add_place_')) {
    const placeId = startParam.replace('add_place_', '');

    // Проверяем, обрабатывали ли уже этот start_param в этой сессии
    const alreadyHandled = sessionStorage.getItem(`handled_${startParam}`);
    console.log('[DEBUG] alreadyHandled from sessionStorage:', alreadyHandled);

    if (!alreadyHandled) {
      try {
        const response = await fetch('/addPlaceById', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData, placeId })
        });

        const result = await response.json();

        // Удаляем start_param из URL
        history.replaceState(null, '', window.location.pathname);

        // Сохраняем в sessionStorage
        sessionStorage.setItem(`handled_${startParam}`, 'true');

        if (result.success) {
          showNotification('Сервис успешно добавлен!');
        } else {
          showNotification('Ошибка: ' + result.error);
        }
      } catch (err) {
        console.error('[ERROR] Ошибка подключения по QR:', err);
        showNotification('Ошибка подключения сервиса.');
        history.replaceState(null, '', window.location.pathname);
      }
    } else {
      console.log('[DEBUG] Пропущена повторная обработка start_param');
    }
  }

  // 🟢 Загружаем список сервисов после всех вышеуказанных действий
  try {
    const response = await fetch('/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });

    const result = await response.json();

    if (result.success) {
      const serviceList = document.getElementById('serviceList');
      serviceList.innerHTML = '';

      if (result.places.length > 0) {
        result.places.forEach((place, index) => {
          const div = document.createElement('div');
          div.className = 'service-item';

          const title = document.createElement('div');
          title.textContent = place.place_name;

          const buttonGroup = document.createElement('div');
          buttonGroup.style.display = 'flex';
          buttonGroup.style.gap = '8px';

          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'delete-button';
          deleteBtn.innerHTML = '🗑️';
          deleteBtn.onclick = () => confirmDelete(place.place_id);

          const bookBtn = document.createElement('button');
          bookBtn.textContent = 'Записаться';
          bookBtn.className = 'book-button';
          bookBtn.onclick = () => openChooseMasterModal(place.place_id);

          buttonGroup.appendChild(deleteBtn);
          buttonGroup.appendChild(bookBtn);
          div.appendChild(title);
          div.appendChild(buttonGroup);
          serviceList.appendChild(div);

          if (
            index < result.places.length - 1 &&
            serviceList.lastChild?.classList?.contains('service-divider') === false
          ) {
            const divider = document.createElement('div');
            divider.className = 'service-divider';
            serviceList.appendChild(divider);
          }
        });
      } else {
        serviceList.textContent = 'Сервисов пока нет';
      }
    } else {
      showNotification('Ошибка аутентификации');
    }
  } catch (error) {
    console.error('[ERROR] Ошибка при загрузке:', error);
    showNotification('Ошибка загрузки сервисов');
  }

  // Переключение на домашнюю вкладку
  switchTab('home');
});














async function fetchAndRenderServices() {
  console.log('[Fetch] Загружаем список сервисов...');
  try {
    const initData = window.Telegram.WebApp.initData;

    const response = await fetch('/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });

    const result = await response.json();
    console.log('[Fetch] Ответ от /auth:', result);

    if (!result.success || !Array.isArray(result.places)) {
      throw new Error('Ошибка загрузки сервисов');
    }

    // ВСТАВЛЯЕМ ТВОЮ ПРЯМУЮ ОТРИСОВКУ СЮДА
    const servicesContainer = document.getElementById('serviceList'); // замените на свой id
    servicesContainer.innerHTML = '';

    result.places.forEach(place => {
      const div = document.createElement('div');
      div.className = 'service-card';
      div.textContent = place.name; // или другая информация
      servicesContainer.appendChild(div);
    });

    console.log('[Fetch] Сервисы успешно отрисованы');

  } catch (err) {
    console.error('[Fetch] Ошибка при загрузке сервисов:', err);
    showNotification('Ошибка загрузки сервисов.');
  }
}


// Модалки:
function openModal() {
  const overlay = document.getElementById('overlay');
  overlay.style.display = 'block'; // включаем overlay
  document.getElementById('addModal').style.display = 'block';
}


function closeModal() {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('addModal').style.display = 'none';
  document.getElementById('idInputModal').style.display = 'none';

  const input = document.getElementById('serviceIdInput');
  if (input) {
    input.disabled = false;
    input.value = '';
  }
}


















async function addByQR() {
  try {
    const initData = window.Telegram.WebApp.initData;

    Telegram.WebApp.showScanQrPopup({
      text: 'Наведите камеру на QR-код сервиса',
    }, async (scannedText) => {
      console.log('[QR] Отсканированное содержимое:', scannedText);

      if (!scannedText) {
        showNotification('QR-код не был отсканирован');
        return;
      }

      let rawParam;
      try {
        const url = new URL(scannedText, window.location.origin);
        rawParam = url.searchParams.get('startapp') || scannedText;
      } catch {
        rawParam = scannedText; // Просто текст
      }

      if (!rawParam.startsWith('add_place_')) {
        showNotification('Неверный формат QR-кода');
        return;
      }

      const placeId = rawParam.replace('add_place_', '');

      try {
        const response = await fetch('/addPlaceById', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData, placeId })
        });

        const result = await response.json();
        console.log('[QR] Ответ от /addPlaceById:', result);

        if (result.success) {
          showNotification('Сервис успешно добавлен!');
          location.reload()
          // await waitForPlaceToAppear(placeId, initData); // Ждем появления
          // await fetchAndRenderServices(); // Перезагружаем список
          // switchTab('home');
        } else {
          showNotification('Ошибка: ' + result.error);
        }
      } catch (err) {
        console.error('[QR] Ошибка при добавлении:', err);
        showNotification('Ошибка подключения сервиса.');
      }
    });
  } catch (err) {
    console.error('[QR] Ошибка запуска сканера:', err);
    showNotification('Произошла ошибка при запуске сканера');
  }
}









async function waitForPlaceToAppear(placeId, initData, maxAttempts = 10, delay = 300) {
  console.log('[Wait] Начинаем ожидание места:', placeId);
  showNotification(`[Wait] Ожидаем появления ID ${placeId} `);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[Wait] Попытка ${attempt} из ${maxAttempts} `);
    showNotification(`[Wait] Попытка ${attempt}...`);

    try {
      const res = await fetch('/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData })
      });

      const result = await res.json();
      console.log('[Wait] Ответ от /auth:', result);

      if (!result.success) {
        showNotification('[Wait] /auth неудачен');
        continue;
      }

      if (!Array.isArray(result.places)) {
        showNotification('[Wait] Некорректный формат places');
        continue;
      }

      const found = result.places.find(p => String(p.place_id) === String(placeId));
      if (found) {
        console.log('[Wait] Место найдено!');
        showNotification('[Wait] Сервис найден!');
        return;
      }
    } catch (err) {
      console.error('[Wait] Ошибка запроса:', err);
      showNotification('[Wait] Ошибка запроса');
    }

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  showNotification('[Wait] Сервис не найден. Проверьте позже.');
  console.warn(`[Wait] Место не найдено после ${maxAttempts} попыток`);
}







function addByID() {
  console.log('addByID called');
  document.getElementById('addModal').style.display = 'none';
  const idModal = document.getElementById('idInputModal');
  idModal.style.display = 'block';

  const input = document.getElementById('serviceIdInput');
  input.value = '';
  input.disabled = false;

  requestAnimationFrame(() => {
    input.focus();
    console.log('Focus set via requestAnimationFrame');
  });
}



async function submitId() {
  console.log('submitId called');
  const idInput = document.getElementById('serviceIdInput');
  const id = idInput.value.trim();

  console.log('Initial: input.disabled =', idInput.disabled);

  if (!id) {
    showNotification('Пожалуйста, введите ID');
    return;
  }

  if (!/^\d+$/.test(id)) {
    showNotification('ID должен содержать только цифры.');
    return;
  }

  try {
    const initData = window.Telegram.WebApp.initData;

    const response = await fetch('/addPlaceById', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, placeId: id })
    });

    const result = await response.json();

    console.log('Response received:', result);

    if (result.success) {
      closeModal();
      showNotification('Сервис успешно добавлен!');
      location.reload(); // перезагрузка страницы для обновления списка
    } else {
      showNotification('Ошибка: ' + result.error);
      idInput.value = '';
      idInput.disabled = false;
      console.log('Error case: input.disabled =', idInput.disabled);
    }
  } catch (error) {
    console.error('Ошибка при добавлении места:', error);
    showNotification('Произошла ошибка');
    idInput.value = '';
    idInput.disabled = false;
    console.log('Catch case: input.disabled =', idInput.disabled);
  }
}




// обработка работы гамбургера

function toggleMenu() {
  const menu = document.getElementById('dropdownMenu');
  const button = document.getElementById('menuButton');
  const overlay = document.getElementById('overlay');

  const isOpen = menu.style.display === 'block';

  if (isOpen) {
    menu.style.display = 'none';
    button.textContent = '☰';
    overlay.style.display = 'none';
  } else {
    menu.style.display = 'block';
    button.textContent = '×';
    overlay.style.display = 'block';
  }
}





// ССЫЛКА НА ПОДДЕРЖКУ
function showSupport() {
  window.open('https://t.me/bookings_support', '_blank');
  toggleMenu();
}

// функция закрытия меню

function closeMenu() {
  const menu = document.getElementById('dropdownMenu');
  const button = document.getElementById('menuButton');

  menu.style.display = 'none';
  button.textContent = '☰';
}

function showNotification(message) {
  const alertBox = document.getElementById('customAlert');
  alertBox.textContent = message;
  alertBox.style.display = 'block';

  setTimeout(() => {
    alertBox.style.display = 'none';
  }, 3000); // Скрыть через 3 секунды
}

let placeIdToDelete = null;

function confirmDelete(placeId) {
  placeIdToDelete = placeId;
  document.getElementById('overlay').style.display = 'block';
  document.getElementById('confirmModal').style.display = 'block';
}


function closeConfirmModal() {
  placeIdToDelete = null;
  document.getElementById('confirmModal').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
}


async function deleteConfirmedService() {
  if (!placeIdToDelete) return;

  try {
    const initData = window.Telegram.WebApp.initData;

    const response = await fetch('/deletePlace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, placeId: placeIdToDelete })
    });

    const result = await response.json();

    closeConfirmModal();

    if (result.success) {
      showNotification('Сервис удалён');
      location.reload();
    } else {
      showNotification('Ошибка: ' + result.error);
    }
  } catch (error) {
    console.error('Ошибка при удалении сервиса:', error);
    showNotification('Произошла ошибка при удалении');
    closeConfirmModal();
  }
}

// Функция открытия модалки выбора мастера


// ВЫБОР МАСТЕРА

function openChooseMasterModal(placeId) {
  currentBookingPlaceId = placeId;

  fetch('/getMastersByPlace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ placeId })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const masterList = document.getElementById('masterList');
        masterList.innerHTML = '';

        data.masters.forEach(master => {
          const btn = document.createElement('button');
          btn.textContent = master.name;
          btn.onclick = () => {
            selectedMaster = master;
            closeAllModals();
            openChooseServiceModal(currentBookingPlaceId);
          };
          masterList.appendChild(btn);
        });

        const modal = document.getElementById('chooseMasterModal');
        const overlay = document.getElementById('overlay');
        modal.style.display = 'block';
        overlay.style.display = 'block';

        // Удалим старый обработчик
        window.removeEventListener('click', handleOutsideClick);

        // Новый обработчик
        handleOutsideClick = function (event) {
          if (!modal.contains(event.target)) {
            closeAllModals();
          }
        };

        setTimeout(() => {
          window.addEventListener('click', handleOutsideClick);
        }, 0);
      } else {
        showNotification('Ошибка при получении мастеров');
      }
    })
    .catch(err => {
      console.error('Ошибка при получении мастеров:', err);
      showNotification('Сетевая ошибка');
    });
}


function closeChooseMasterModal() {
  document.getElementById('chooseMasterModal').style.display = 'none';
  const overlay = document.getElementById('overlay');
  overlay.style.display = 'none';
  overlay.onclick = null; // Удаляем обработчик клика
}






// ВЫБОР УСЛУГИ
function openChooseServiceModal(placeId) {
  fetch('/getServicesByPlace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ placeId })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const serviceList = document.getElementById('serviceSelectList');
        serviceList.innerHTML = '';
        selectedServices = [];

        data.services.forEach(service => {
          const label = document.createElement('label');
          label.style.display = 'block';
          label.style.marginBottom = '8px';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.value = service.service_id;

          // ✅ Добавляем необходимые data-атрибуты
          checkbox.dataset.name = service.name;
          checkbox.dataset.duration = service.duration_minutes;

          checkbox.onchange = () => {
            if (checkbox.checked) {
              selectedServices.push({
                id: service.service_id,
                name: service.name,
                duration: service.duration_minutes
              });
            } else {
              selectedServices = selectedServices.filter(s => s.id !== service.service_id);
            }
          };

          label.appendChild(checkbox);
          label.appendChild(document.createTextNode(` ${service.name} (${service.duration_minutes} мин)`));
          serviceList.appendChild(label);
        });

        document.getElementById('chooseServiceModal').style.display = 'block';
        document.getElementById('overlay').style.display = 'block';
      } else {
        showNotification('Не удалось получить список услуг');
      }
    })
    .catch(err => {
      console.error('Ошибка при получении услуг:', err);
      showNotification('Ошибка сервера');
    });
}


// кнопка продолжить после выбора услуг
function submitSelectedServices() {
  // Собираем выбранные услуги из чекбоксов
  selectedServices = Array.from(document.querySelectorAll('#serviceSelectList input[type="checkbox"]:checked')).map(input => ({
    id: input.value,
    name: input.dataset.name,
    duration: Number(input.dataset.duration)
  }));

  if (selectedServices.length === 0) {
    showNotification('Выберите хотя бы одну услугу');
    return;
  }

  closeChooseServiceModal();

  bookingDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
  console.log('Выбран мастер:', selectedMaster.name);
  console.log('Услуги:', selectedServices.map(s => s.name));
  console.log('Общая длительность:', totalDuration, 'минут');
  openChooseDateModal();

}

function closeChooseServiceModal() {
  document.getElementById('chooseServiceModal').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
}

// подгрузка чекбоксов
function renderServices(services) {
  const serviceSelectList = document.getElementById('serviceSelectList');
  serviceSelectList.innerHTML = ''; // очищаем список перед вставкой

  services.forEach(service => {
    const label = document.createElement('label');
    label.style.display = 'block'; // чтобы каждый чекбокс был с новой строки
    label.innerHTML = `
      < input type = "checkbox"
    value = "${service.service_id}"
    data - name="${service.service_name}"
    data - duration="${service.duration}" >
      ${service.service_name} (${service.duration} мин)
    `;
    serviceSelectList.appendChild(label);
  });
}













// ВЫБОР ДАТЫ
function openChooseDateModal() {
  const dateInput = document.getElementById('bookingDatePicker');

  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;
  dateInput.value = today;

  selectedDate = today;

  dateInput.onchange = () => {
    selectedDate = dateInput.value;
  };

  document.getElementById('chooseDateModal').style.display = 'block';
  document.getElementById('overlay').style.display = 'block';
}

function closeChooseDateModal() {
  document.getElementById('chooseDateModal').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
}

function submitSelectedDate() {
  if (!selectedDate) {
    showNotification('Выберите дату');
    return;
  }

  console.log('Дата выбрана:', selectedDate);

  closeChooseDateModal();

  // Переход к следующему шагу: выбор времени (свободные слоты)
  openChooseTimeModal(selectedDate, bookingDuration);
  // openChooseSlotModal(); // эту функцию сделаем дальше
}


















//ВЫБОР ВРЕМЕНИ
function openChooseTimeModal(date, totalDuration) {
  console.log('🔍 masterId:', selectedMaster?.master_id);
  console.log('📅 date:', date);
  console.log('⏱️ duration:', totalDuration);

  fetch('/getFreeSlots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      masterId: selectedMaster.master_id,
      date: date,
      duration: totalDuration
    })
  })
    .then(res => res.json())
    .then(data => {
      const slotList = document.getElementById('slotList');
      slotList.innerHTML = '';

      if (data.success) {
        if (data.slots.length === 0) {
          showNotification('В этот день нет свободных мест. Пожалуйста, выберите другой');
          return;
        }

        let selectedTime = null;

        data.slots.forEach(slot => {
          const btn = document.createElement('button');
          btn.textContent = slot;
          btn.className = 'time-slot-button';

          btn.onclick = () => {
            document.querySelectorAll('.time-slot-button').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedSlot = slot;
            selectedTime = slot;
            console.log('✅ Выбрано время:', selectedTime);

            document.getElementById('confirmBookingBtn').disabled = false;
          };

          slotList.appendChild(btn);
        });

        document.getElementById('chooseTimeModal').style.display = 'block';
        document.getElementById('overlay').style.display = 'block';
      } else {
        showNotification('Ошибка при получении свободного времени');
      }
    })
    .catch(err => {
      console.error('Ошибка при получении слотов:', err);
      showNotification('Ошибка сервера');
    });
}


function closeChooseTimeModal() {
  document.getElementById('chooseTimeModal').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
  selectedSlot = null;
  document.getElementById('confirmBookingBtn').disabled = true;
}













// ПОДТВЕРЖДЕНИЕ ЗАПИСИ
function submitBooking() {
  if (!selectedSlot || !selectedDate || !selectedMaster || selectedServices.length === 0) {
    showNotification('Пожалуйста, выберите все данные для записи');
    return;
  }

  const initData = window.Telegram.WebApp.initData;

  fetch('/createBooking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      initData,
      masterId: selectedMaster.master_id,
      date: selectedDate,
      time: selectedSlot,
      services: selectedServices
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showNotification('Вы успешно записаны!');
        closeChooseTimeModal(); // закрываем модалку
      } else {
        showNotification('Ошибка при записи: ' + data.error);
      }
    })
    .catch(err => {
      console.error('Ошибка при записи:', err);
      showNotification('Ошибка сервера при записи');
    });
}










// ПЕРЕКЛЮЧАТЕЛЬ МЕЖДУ ОСНОВНЫМИ ОКНАМИ 
async function switchTab(tab) {
  console.log('👉 Переключение вкладки на:', tab);

  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => screen.style.display = 'none');

  const title = document.getElementById('mainTitle');
  const dateControls = document.getElementById('businessDateControls');

  // Скрываем контролы выбора даты по умолчанию
  if (dateControls) dateControls.style.display = 'none';

  if (tab === 'home') {
    console.log('➡️ Открываем главный экран');
    document.getElementById('mainScreen').style.display = 'block';
    if (title) {
      title.style.display = 'block';
      title.textContent = 'Ваши сервисы:';
    }

  } else if (tab === 'bookings') {
    console.log('➡️ Открываем экран записей');
    document.getElementById('bookingsScreen').style.display = 'block';
    loadBookings();
    if (title) {
      title.style.display = 'block';
      title.textContent = 'Ваши записи:';
    }

  } else if (tab === 'business') {
    console.log('➡️ Открываем экран Бизнес');
    document.getElementById('businessScreen').style.display = 'block';

    if (title) title.style.display = 'none';

    const role = await getUserRoleOnce();

    if (role === 'staff') {
      if (dateControls) {
        dateControls.style.display = 'flex';
        const input = document.getElementById('businessDate');
        if (input) {
          const today = new Date().toISOString().split('T')[0];
          input.value = today;
        }
      }
    }

    loadBusinessContent(); // вызываем загрузку записей
  }
}




// ФУНКЦИЯ ЗАГРУЗКИ ЗАПИСЕЙ
function loadBookings() {
  const initData = window.Telegram.WebApp.initData;

  fetch('/getUserBookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData })
  })
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById('bookingList');
      list.innerHTML = '';

      if (data.success && data.bookings.length > 0) {
        data.bookings.forEach(booking => {
          const formattedDate = new Date(booking.date).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          });

          const formattedTime = booking.time.slice(0, 5);

          const div = document.createElement('div');
          div.className = 'booking-card';
          div.innerHTML = `
            Услуга: ${booking.service_name || booking.services?.join(', ')}<br>
            Дата: ${formattedDate}<br>
            Время: ${formattedTime}<br>
            Мастер: ${booking.master_name}<br>
            Длительность: ${booking.duration} мин
            <br>
            <button class="delete-booking-btn" data-id="${booking.appointment_id}">
              ❌ Отменить запись
            </button>
          `;
          list.appendChild(div);
        });

        // вешаем обработчики на кнопки удаления
        document.querySelectorAll('.delete-booking-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const appointmentId = e.target.dataset.id;
            confirmDeleteBooking(appointmentId);

          });
        });

      } else {
        list.innerHTML = '<div>У вас пока нет записей.</div>';
      }
    })
    .catch(err => {
      console.error('Ошибка при получении записей:', err);
      showNotification('Не удалось загрузить записи');
    });
}


let appointmentIdToDelete = null;

function confirmDeleteBooking(appointmentId) {
  appointmentIdToDelete = appointmentId;
  document.getElementById('bookingOverlay').style.display = 'block';
  document.getElementById('bookingConfirmModal').style.display = 'block';
}

function closeBookingConfirmModal() {
  document.getElementById('bookingOverlay').style.display = 'none';
  document.getElementById('bookingConfirmModal').style.display = 'none';
}


async function deleteConfirmedBooking() {
  if (!appointmentIdToDelete) return;

  try {
    const initData = window.Telegram.WebApp.initData;

    const response = await fetch('/deleteBooking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, appointmentId: appointmentIdToDelete })
    });

    const result = await response.json();

    closeBookingConfirmModal();

    if (result.success) {
      showNotification('Запись удалена');
      loadBookings();
    } else {
      showNotification('Ошибка: ' + result.error);
    }
  } catch (error) {
    console.error('Ошибка при удалении записи:', error);
    showNotification('Произошла ошибка при удалении');
    closeBookingConfirmModal();
  }
}





function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}








// ФУНКЦИЯ ОТОБРАЖЕНИЯ КОНТЕНТА ДЛЯ ЭКРАНА БИЗНЕС
async function loadBusinessContent() {
  console.log('🚀 Загружаем бизнес-контент...');

  const businessContent = document.getElementById('businessContent');
  businessContent.innerHTML = 'Загрузка...';

  try {
    const initData = window.Telegram.WebApp.initData;
    console.log('📦 initData:', initData);

    const response = await fetch('/api/getUserRole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });

    const data = await response.json();
    console.log('📨 Ответ от /api/getUserRole получен:', data);

    userRole = data.role; // Сохраняем роль

    if (!data.success) {
      console.warn('❌ Ошибка определения роли:', data.error || 'unknown');
      businessContent.innerHTML = '<p>Не удалось определить роль пользователя.</p>';
      return;
    }

    if (data.role === 'client') {
      console.log('👤 Пользователь — клиент');
      businessContent.innerHTML = `
              <p>Данный раздел предназначен для сотрудников Ваших сервисов. Если вы хотите подключить свой бизнес к нашему сервису, напишите нам</p>
              <div style="display: flex; justify-content: center; margin-top: 16px;">
                <button id="contactButton" class="modal-button">Связаться</button>
              </div>
              `;
      document.getElementById('contactButton').onclick = () => {
        console.log('📞 Нажата кнопка "Связаться"');
        showSupport();
      };

    } else if (data.role === 'staff') {
      console.log('🧑‍💼 Пользователь — сотрудник');

      businessContent.innerHTML = `<div id="recordsTable">Загрузка записей...</div>`;

      const datePicker = document.getElementById('businessDate');
      const recordsTable = document.getElementById('recordsTable');

      if (!datePicker) {
        console.warn('❗ Элемент #businessDate не найден в header-bar');
        recordsTable.innerHTML = '<p>Ошибка: не найден элемент выбора даты.</p>';
        return;
      }

      const fetchBookings = async (selectedDate) => {
        const bookingsResponse = await fetch('/api/getStaffBookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData, selectedDate })
        });

        const bookingsData = await bookingsResponse.json();
        console.log('📨 Ответ от /api/getStaffBookings получен:', bookingsData);

        if (!bookingsData.success) {
          console.warn('❌ Ошибка при загрузке записей:', bookingsData.error || 'unknown');
          recordsTable.innerHTML = '<p>Ошибка при загрузке записей.</p>';
          return;
        }

        if (bookingsData.bookings.length === 0) {
          console.log('ℹ️ Нет записей на эту дату');
          recordsTable.innerHTML = '<p>У вас пока нет записей на эту дату.</p>';
          return;
        }

        // 🧩 Генерируем таблицу с кнопкой "Не пришёл"
        let html = `
    <table>
      <thead>
        <tr>
          <th>Время</th>
          <th>Клиент</th>
          <th>Услуга</th>
          <th>Мастер</th>
          <th>Действие</th>
        </tr>
      </thead>
      <tbody>
  `;

        bookingsData.bookings.forEach(b => {
          const noShow = b.no_show === true; // ← поле из БД
          html += `
      <tr>
        <td>${b.time.slice(0, 5)}</td>
        <td>${b.client_name || 'неизвестный'}</td>
        <td>${b.services_names}</td>
        <td>${b.master_name || '—'}</td>
        <td>
          ${noShow
              ? '❌ Не пришёл'
              : `<button class="no-show-btn" data-id="${b.appointment_id}">Не пришёл</button>`
            }
        </td>
      </tr>
    `;
        });

        html += '</tbody></table>';
        recordsTable.innerHTML = html;

        // 🎯 Вешаем обработчики на кнопки
        document.querySelectorAll('.no-show-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            console.log('🔹 Нажата кнопка "Не пришёл"', e.target.dataset.id);
            const id = e.target.dataset.id;
            const clientName = e.target.closest('tr').querySelector('td:nth-child(2)').textContent;
            console.log('🔹 Имя клиента для модалки:', clientName);
            showNoShowModal(id, clientName);
          });
        });



      };


      await fetchBookings(datePicker.value);

      datePicker.addEventListener('change', (e) => {
        fetchBookings(e.target.value);
      });

    } else {
      console.warn('⚠️ Неизвестная роль:', data.role);
      businessContent.innerHTML = '<p>Роль пользователя не определена.</p>';
    }

  } catch (error) {
    console.error('💥 Ошибка в loadBusinessContent:', error);
    businessContent.innerHTML = '<p>Ошибка при загрузке данных.</p>';
  }
}




function showNoShowModal(appointmentId, clientName) {
  console.log('🟢 showNoShowModal вызвана', appointmentId, clientName);

  // Получаем модалку и overlay
  const modal = document.getElementById('noShowModal');
  const overlay = document.getElementById('overlay');

  // Подставляем имя клиента
  modal.querySelector('#noShowClientName').textContent = clientName;

  // Показываем модалку и overlay
  modal.style.display = 'block';
  overlay.style.display = 'block';

  // Удаляем старые обработчики, если были
  const confirmBtn = modal.querySelector('#confirmNoShowBtn');
  const cancelBtn = modal.querySelector('#cancelNoShowBtn');

  confirmBtn.replaceWith(confirmBtn.cloneNode(true));
  cancelBtn.replaceWith(cancelBtn.cloneNode(true));

  // Снова получаем кнопки после клонирования
  const newConfirmBtn = modal.querySelector('#confirmNoShowBtn');
  const newCancelBtn = modal.querySelector('#cancelNoShowBtn');

  // Кнопка "Подтвердить"
  newConfirmBtn.addEventListener('click', async () => {
    console.log('🔹 Подтверждение "не пришёл" нажато для', appointmentId);

    const initData = window.Telegram.WebApp.initData;
    console.log('🔹 initData для запроса:', initData);

    try {
      const res = await fetch(`/api/appointments/${appointmentId}/no_show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData })
      });

      const data = await res.json();
      console.log('🔹 Ответ от сервера:', data);

      if (data.success) {
        showNotification('Клиент отмечен как не пришедший');
        closeNoShowModal();
        loadBusinessContent(); // обновляем таблицу записей
      } else {
        showNotification('Ошибка при отметке: ' + (data.error || 'неизвестная'));
      }
    } catch (err) {
      console.error('❌ Ошибка сервера при отметке клиента:', err);
      showNotification('Ошибка сети при отметке клиента');
    }
  });

  // Кнопка "Отмена"
  newCancelBtn.addEventListener('click', () => {
    console.log('🔹 Отмена модалки "не пришёл"');
    closeNoShowModal();
  });
}

// Функция закрытия модалки
function closeNoShowModal() {
  const modal = document.getElementById('noShowModal');
  const overlay = document.getElementById('overlay');
  modal.style.display = 'none';
  overlay.style.display = 'none';
}





// Показываем модалку "Не пришёл" с overlay
// function showNoShowModal(appointmentId, clientName, onConfirm) {
//   console.log('🟢 showNoShowModal вызвана', appointmentId, clientName);

//   const modal = document.getElementById('confirmModal');
//   const overlay = document.getElementById('overlay'); // используем существующий overlay
//   const confirmBtn = modal.querySelector('#confirmNoShowBtn');
//   const closeBtn = modal.querySelector('#cancelDeleteBtn');

//   // Вставляем текст с клиентом
//   modal.querySelector('.modal-title').textContent = `Отметить клиента ${clientName} как "не пришёл"?`;

//   // Показываем модалку и overlay
//   overlay.style.display = 'block';
//   modal.style.display = 'block';

//   // Обработчик клика вне модалки для закрытия
//   window.removeEventListener('click', handleOutsideClick);
//   handleOutsideClick = function (event) {
//     if (!modal.contains(event.target)) {
//       closeNoShowModal();
//     }
//   };
//   setTimeout(() => {
//     window.addEventListener('click', handleOutsideClick);
//   }, 0);

//   // Обработчики кнопок
//   confirmBtn.onclick = async () => {
//     console.log('🔹 Подтверждение "не пришёл" нажато для', appointmentId);
//     try {
//       const initData = window.Telegram.WebApp.initData;
//       const response = await fetch(`/api/appointments/${appointmentId}/no_show`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ initData })
//       });

//       const result = await response.json();
//       if (result.success) {
//         console.log('✅ Клиент отмечен как "не пришёл"');
//         onConfirm(); // обновляем таблицу
//         closeNoShowModal();
//       } else {
//         console.error('❌ Ошибка сервера при отметке клиента:', result.error);
//         showNotification('Ошибка сервера при отметке клиента');
//       }
//     } catch (err) {
//       console.error('❌ Ошибка запроса:', err);
//       showNotification('Ошибка сети при отметке клиента');
//     }
//   };

//   closeBtn.onclick = () => {
//     closeNoShowModal();
//   };
// }

// // Закрываем модалку "Не пришёл"
// function closeNoShowModal() {
//   const modal = document.getElementById('confirmModal');
//   const overlay = document.getElementById('overlay');
//   modal.style.display = 'none';
//   overlay.style.display = 'none';

//   // Убираем обработчик клика вне модалки
//   window.removeEventListener('click', handleOutsideClick);
//   handleOutsideClick = null;
// }






// МОДАЛКА "КЛИЕНТ НЕ ПРИШЁЛ" без overlay (старая)
// function showNoShowModal(appointmentId, clientName) {
//   console.log('🟢 showNoShowModal вызвана', appointmentId, clientName);

//   // Создаём overlay модалки
//   const modalOverlay = document.createElement('div');
//   modalOverlay.id = 'noShowModal';
//   modalOverlay.className = 'modal-overlay'; // используем общий класс для модалок
//   modalOverlay.innerHTML = `
//     <div class="modal">
//       <h3>Отметить как "не пришёл"</h3>
//       <p>Вы уверены, что клиент <b>${clientName}</b> не пришёл?</p>
//       <div class="modal-buttons">
//         <button id="confirmNoShowBtn" class="modal-button">Подтвердить</button>
//         <button id="cancelNoShowBtn" class="modal-button modal-cancel">Отмена</button>
//       </div>
//     </div>
//   `;

//   document.body.appendChild(modalOverlay);
//   modalOverlay.style.display = 'flex'; // overlay виден
//   modalOverlay.querySelector('.modal').style.display = 'block'; // сама модалка видна
//   // modalOverlay.style.zIndex = '9999';
//   // modalOverlay.querySelector('.modal').style.zIndex = '10000';

//   console.log('🟢 Модалка добавлена в DOM');

//   // Кнопка "Подтвердить"
//   modalOverlay.querySelector('#confirmNoShowBtn').addEventListener('click', async () => {
//     console.log('🔹 Подтверждение "не пришёл" нажато для', appointmentId);

//     const initData = window.Telegram.WebApp.initData;
//     console.log('🔹 initData для запроса:', initData);

//     try {
//       const res = await fetch(`/api/appointments/${appointmentId}/no_show`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ initData })
//       });

//       const data = await res.json();
//       console.log('🔹 Ответ от сервера:', data);

//       if (data.success) {
//         showNotification('Клиент отмечен как не пришедший');
//         modalOverlay.remove();
//         loadBusinessContent(); // обновляем таблицу записей
//       } else {
//         showNotification('Ошибка при отметке: ' + (data.error || 'неизвестная'));
//       }
//     } catch (err) {
//       console.error('❌ Ошибка сервера при отметке клиента:', err);
//       showNotification('Ошибка сервера при отметке клиента');
//     }
//   });

//   // Кнопка "Отмена"
//   modalOverlay.querySelector('#cancelNoShowBtn').addEventListener('click', () => {
//     console.log('🔹 Отмена модалки "не пришёл"');
//     modalOverlay.remove();
//   });
// }








function closeAllModals() {
  // Скрываем все возможные модальные окна
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.style.display = 'none';
  });

  // Скрываем оверлей
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'none';

  // Удаляем глобальный обработчик клика вне модалок (если был)
  window.removeEventListener('click', handleOutsideClick);
}






// ПОКАЗЫВАТЬ ГЛАВНЫЙ ЭКРАН ПРИ ЗАПУСКЕ
document.addEventListener('DOMContentLoaded', () => {
  switchTab('home');
});



// Автоматически скрывать меню при клике вне его
document.addEventListener('click', function (event) {
  const menu = document.getElementById('dropdownMenu');
  const button = document.getElementById('menuButton');
  if (menu.style.display === 'block' &&
    !menu.contains(event.target) &&
    event.target !== button) {
    menu.style.display = 'none';
    button.textContent = '☰';
  }
});
