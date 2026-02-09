export interface EmailFormProps {
    email: string;
    setEmail: (value: string) => void;
    onSubmit: () => void;
    loading: boolean;
  }
  
  export interface OtpFormProps {
    onSubmit: (otp: string) => void;
    loading: boolean;
  }