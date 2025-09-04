import React, { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";

const DateCalendarWidget: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [time, setTime] = useState(new Date());

  // Обновление времени каждую секунду
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const months = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];

  const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Получаем день недели первого дня месяца (0 = воскресенье, 1 = понедельник, ...)
    // Преобразуем к европейской системе (0 = понедельник, 6 = воскресенье)
    let startDayOfWeek = firstDay.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const days = [];
    
    // Добавляем пустые ячейки для дней предыдущего месяца
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Добавляем дни текущего месяца
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date | null) => {
    if (!date) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-lg p-4 shadow-sm border border-purple-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-purple-800 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Календарь
        </h3>
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="p-1 text-purple-600 hover:text-purple-800 transition-colors"
          title={showCalendar ? "Скрыть календарь" : "Показать календарь"}
        >
          {showCalendar ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      <div className="space-y-4">
        {/* Текущая дата и время */}
        <div className="bg-white/60 rounded-md p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <span className="text-2xl font-bold text-purple-800 font-mono">
              {formatTime(time)}
            </span>
          </div>
          <div className="text-sm text-gray-700 capitalize">
            {formatDate(selectedDate)}
          </div>
        </div>

        {/* Календарь */}
        {showCalendar && (
          <div className="bg-white/60 rounded-md p-3">
            {/* Навигация по месяцам */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h4 className="font-semibold text-purple-800">
                {months[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h4>
              <button
                onClick={() => navigateMonth('next')}
                className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Дни недели */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-xs font-medium text-gray-600 text-center py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Календарная сетка */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (day) {
                      setSelectedDate(day);
                      setShowCalendar(false);
                    }
                  }}
                  disabled={!day}
                  className={`
                    aspect-square text-xs p-1 rounded transition-all
                    ${!day ? 'invisible' : ''}
                    ${isToday(day) ? 'bg-purple-600 text-white font-bold shadow-sm' : ''}
                    ${isSelected(day) && !isToday(day) ? 'bg-purple-300 text-purple-800 font-semibold' : ''}
                    ${!isToday(day) && !isSelected(day) ? 'hover:bg-purple-200 text-gray-700' : ''}
                  `}
                >
                  {day?.getDate()}
                </button>
              ))}
            </div>

            {/* Быстрые действия */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setSelectedDate(new Date());
                  setCurrentDate(new Date());
                }}
                className="flex-1 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              >
                Сегодня
              </button>
              <button
                onClick={() => setShowCalendar(false)}
                className="flex-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DateCalendarWidget;