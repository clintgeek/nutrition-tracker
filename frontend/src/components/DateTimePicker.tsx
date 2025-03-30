import React, { useState } from 'react';
import { format } from 'date-fns';
import styled from 'styled-components';

interface DateTimePickerProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
  onClose?: () => void;
}

const Modal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 300px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.div`
  font-size: 1.2em;
  font-weight: 500;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  padding: 5px;
  &:hover {
    opacity: 0.7;
  }
`;

const MonthSelector = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const MonthTitle = styled.div`
  font-weight: 500;
`;

const NavigationButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px 10px;
  &:hover {
    background: #f0f0f0;
    border-radius: 4px;
  }
`;

const Calendar = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  margin-bottom: 15px;
`;

const WeekDay = styled.div`
  text-align: center;
  font-weight: 500;
  font-size: 0.9em;
  padding: 5px;
`;

const Day = styled.button<{ isSelected?: boolean }>`
  aspect-ratio: 1;
  border: none;
  background: ${props => props.isSelected ? '#4A90E2' : 'none'};
  color: ${props => props.isSelected ? 'white' : 'inherit'};
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9em;

  &:hover {
    background: ${props => props.isSelected ? '#4A90E2' : '#f0f0f0'};
  }
`;

const TimeContainer = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 15px;
`;

const TimeInput = styled.input`
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100px;
  text-align: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const Button = styled.button<{ primary?: boolean }>`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: ${props => props.primary ? '#4A90E2' : 'transparent'};
  color: ${props => props.primary ? 'white' : '#4A90E2'};

  &:hover {
    opacity: 0.9;
  }
`;

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  selectedDate,
  onChange,
  onClose
}) => {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(currentYear);
    newDate.setMonth(currentMonth);
    newDate.setDate(day);
    setCurrentDate(newDate);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(':');
    const newDate = new Date(currentDate);
    newDate.setHours(parseInt(hours), parseInt(minutes));
    setCurrentDate(newDate);
  };

  const handleSave = () => {
    onChange(currentDate);
    onClose?.();
  };

  return (
    <Modal>
      <Header>
        <Title>Select Date & Time</Title>
        <CloseButton onClick={onClose}>×</CloseButton>
      </Header>

      <MonthSelector>
        <NavigationButton onClick={handlePrevMonth}>&lt;</NavigationButton>
        <MonthTitle>
          {format(new Date(currentYear, currentMonth), 'MMMM yyyy')}
        </MonthTitle>
        <NavigationButton onClick={handleNextMonth}>&gt;</NavigationButton>
      </MonthSelector>

      <Calendar>
        {weekDays.map(day => (
          <WeekDay key={day}>{day}</WeekDay>
        ))}

        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <Day key={`empty-${index}`} disabled />
        ))}

        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const isSelected =
            day === currentDate.getDate() &&
            currentMonth === currentDate.getMonth() &&
            currentYear === currentDate.getFullYear();

          return (
            <Day
              key={day}
              isSelected={isSelected}
              onClick={() => handleDayClick(day)}
            >
              {day}
            </Day>
          );
        })}
      </Calendar>

      <TimeContainer>
        <TimeInput
          type="time"
          value={format(currentDate, 'HH:mm')}
          onChange={handleTimeChange}
        />
      </TimeContainer>

      <ButtonContainer>
        <Button onClick={onClose}>Cancel</Button>
        <Button primary onClick={handleSave}>Save</Button>
      </ButtonContainer>
    </Modal>
  );
};

export default DateTimePicker;