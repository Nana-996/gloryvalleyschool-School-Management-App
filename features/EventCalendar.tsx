import React, { useState, useMemo } from 'react';
import { SchoolEvent } from '../types';
import { Modal } from '../components/Modal';
import { PlusIcon } from '../components/Icons';

const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface EventFormProps {
  onSubmit: (event: Omit<SchoolEvent, 'id'>) => void;
  onClose: () => void;
  date: string;
}

const EventForm = ({ onSubmit, onClose, date }: EventFormProps) => {
  const [formData, setFormData] = useState({ title: '', description: '', type: 'Event' as SchoolEvent['type'], date });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(formData); };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="form-group">
        <label className="form-label">Date</label>
        <input type="date" name="date" value={formData.date} onChange={handleChange} className="form-input" required />
      </div>
      <div className="form-group">
        <label className="form-label">Title</label>
        <input type="text" name="title" value={formData.title} onChange={handleChange} className="form-input" required />
      </div>
      <div className="form-group">
        <label className="form-label">Type</label>
        <select name="type" value={formData.type} onChange={handleChange} className="form-select">
          <option>Event</option><option>Exam</option><option>Holiday</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="form-input" style={{ resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button type="submit" className="btn btn-primary">Add Event</button>
      </div>
    </form>
  );
};

interface EventCalendarProps {
  events: SchoolEvent[];
  setEvents: React.Dispatch<React.SetStateAction<SchoolEvent[]>>;
}

export const EventCalendar = ({ events, setEvents }: EventCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarGrid = useMemo(() => {
    const totalDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    const grid: ({ day: number; date: string } | null)[] = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let day = 1; day <= totalDays; day++) {
      grid.push({ day, date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` });
    }
    return grid;
  }, [year, month]);

  const eventsThisMonth = useMemo(() => {
    return events.filter(e => { const d = new Date(e.date); return d.getFullYear() === year && d.getMonth() === month; }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, year, month]);

  const changeMonth = (delta: number) => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  const handleAddEventClick = (date: string) => { setSelectedDate(date); setIsModalOpen(true); };
  const handleAddEvent = (eventData: Omit<SchoolEvent, 'id'>) => { setEvents(prev => [...prev, { ...eventData, id: `e${Date.now()}` }]); setIsModalOpen(false); };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <h1 className="page-title">Event Calendar</h1>
        <button onClick={() => handleAddEventClick(new Date().toISOString().slice(0, 10))} className="btn btn-primary"><PlusIcon /> Add Event</button>
      </div>

      <div className="card">
        <div className="calendar-nav">
          <button onClick={() => changeMonth(-1)} className="calendar-nav-btn">&lt;</button>
          <h2 className="calendar-month">{monthNames[month]} {year}</h2>
          <button onClick={() => changeMonth(1)} className="calendar-nav-btn">&gt;</button>
        </div>

        {/* Mobile: List */}
        <div style={{ display: 'none' }} className="calendar-mobile-list">
          {eventsThisMonth.length > 0 ? eventsThisMonth.map(event => (
            <div key={event.id} className="event-list-item">
              <div className="event-date-block">
                <span className="event-date-month">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                <span className="event-date-day">{new Date(event.date).getDate()}</span>
              </div>
              <div>
                <p className="event-title">{event.title}</p>
                <p className="event-desc">{event.description}</p>
                <span className={`badge ${event.type === 'Exam' ? 'badge-red' : event.type === 'Holiday' ? 'badge-green' : 'badge-blue'}`}>{event.type}</span>
              </div>
            </div>
          )) : <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>No events this month.</p>}
        </div>

        {/* Desktop: Grid */}
        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="calendar-day-header">{d}</div>
          ))}
          {calendarGrid.map((cell, i) => (
            <div key={i} className="calendar-cell" onClick={() => cell && handleAddEventClick(cell.date)}>
              {cell && (
                <>
                  <span className="calendar-day-num">{cell.day}</span>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    {events.filter(e => e.date === cell.date).map(event => (
                      <div key={event.id} title={event.title} className={`calendar-event ${event.type === 'Exam' ? 'cal-exam' : event.type === 'Holiday' ? 'cal-holiday' : 'cal-event'}`}>
                        {event.title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Event">
        <EventForm onSubmit={handleAddEvent} onClose={() => setIsModalOpen(false)} date={selectedDate} />
      </Modal>
    </div>
  );
};