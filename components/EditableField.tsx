import React, { useState, useEffect, useRef } from 'react';

interface EditableFieldProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}

const EditableField: React.FC<EditableFieldProps> = ({ value, onChange, className = "", placeholder, multiline = false, rows = 1 }) => {
  const [internalValue, setInternalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    if (multiline && textareaRef.current) {
        // Reset height to auto to allow shrinking
        textareaRef.current.style.height = 'auto';
        // Set height to scrollHeight to fit content
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [internalValue, multiline]);

  const handleBlur = () => {
    onChange(internalValue);
  };

  const commonClasses = `bg-transparent hover:bg-yellow-50 focus:bg-yellow-100 transition-colors border-b border-dashed border-gray-300 focus:border-blue-500 focus:outline-none print:border-none print:bg-transparent min-w-0 ${className}`;

  if (multiline) {
    return (
      <textarea
        ref={textareaRef}
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        onBlur={handleBlur}
        className={`${commonClasses} w-full resize-none overflow-hidden block`}
        placeholder={placeholder}
        rows={rows}
      />
    );
  }

  return (
    <input
      type="text"
      value={internalValue}
      onChange={(e) => setInternalValue(e.target.value)}
      onBlur={handleBlur}
      className={commonClasses}
      placeholder={placeholder}
    />
  );
};

export default EditableField;