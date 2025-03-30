import React, { useState } from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';
import DateTimePicker from './DateTimePicker';

interface BloodPressureFormData {
  systolic: number;
  diastolic: number;
  pulse?: number;
  log_date: string;
  notes?: string;
}

interface BloodPressureFormProps {
  onSubmit: (data: BloodPressureFormData) => void;
  initialValues?: BloodPressureFormData;
  onCancel?: () => void;
}

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.label`
  font-weight: 500;
`;

const Input = styled.input`
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
`;

const TextArea = styled.textarea`
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
  min-height: 100px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
`;

const StyledButton = styled.button<{ $primary?: boolean }>`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: ${props => props.$primary ? '#4A90E2' : 'transparent'};
  color: ${props => props.$primary ? 'white' : '#4A90E2'};

  &:hover {
    opacity: 0.9;
  }
`;

const DateButton = styled.button`
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  text-align: left;
  font-size: 1em;

  &:hover {
    background: #f5f5f5;
  }
`;

const BloodPressureForm: React.FC<BloodPressureFormProps> = ({
  onSubmit,
  initialValues,
  onCancel
}) => {
  const [formData, setFormData] = useState<BloodPressureFormData>({
    systolic: initialValues?.systolic ?? 120,
    diastolic: initialValues?.diastolic ?? 80,
    pulse: initialValues?.pulse,
    log_date: initialValues?.log_date ?? new Date().toISOString(),
    notes: initialValues?.notes ?? ''
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'pulse' ? (value ? parseInt(value) : undefined) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleDateSelect = (date: Date) => {
    setFormData(prev => ({
      ...prev,
      log_date: date.toISOString()
    }));
    setShowDatePicker(false);
  };

  return (
    <StyledForm onSubmit={handleSubmit}>
      <FormGroup>
        <Label htmlFor="date">Date & Time</Label>
        <DateButton
          type="button"
          id="date"
          onClick={() => setShowDatePicker(true)}
        >
          {format(new Date(formData.log_date), 'PPpp')}
        </DateButton>
      </FormGroup>

      <FormGroup>
        <Label htmlFor="systolic">Systolic (mmHg)</Label>
        <Input
          id="systolic"
          type="number"
          name="systolic"
          value={formData.systolic}
          onChange={handleChange}
          required
          min={60}
          max={250}
        />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="diastolic">Diastolic (mmHg)</Label>
        <Input
          id="diastolic"
          type="number"
          name="diastolic"
          value={formData.diastolic}
          onChange={handleChange}
          required
          min={40}
          max={150}
        />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="pulse">Pulse (bpm)</Label>
        <Input
          id="pulse"
          type="number"
          name="pulse"
          value={formData.pulse || ''}
          onChange={handleChange}
          min={40}
          max={200}
        />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="notes">Notes</Label>
        <TextArea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Add any additional notes here..."
        />
      </FormGroup>

      <ButtonGroup>
        {onCancel && (
          <StyledButton type="button" onClick={onCancel}>
            Cancel
          </StyledButton>
        )}
        <StyledButton type="submit" $primary>
          Save
        </StyledButton>
      </ButtonGroup>

      {showDatePicker && (
        <DateTimePicker
          selectedDate={new Date(formData.log_date)}
          onChange={handleDateSelect}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </StyledForm>
  );
};

export default BloodPressureForm;