export type User = {
  id: string;
  name: string;
  email: string;
  role: "Fisioterapeuta" | "Administrador";
  plan: "Free" | "PRO Mensal" | "PRO Anual";
  mode: "Profissional" | "Clínica" | "Administrador";
  theme: "Automático" | "Claro" | "Escuro";
  createdAt: string;
};

export type Patient = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  cpf?: string;
  status: "Ativo" | "Inativo";
  treatmentGoal?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Charge = {
  id: string;
  patientId?: string;
  patientName?: string;
  description: string;
  amount: number;
  dueDate: string;
  status: "Pendente" | "Paga" | "Atrasada";
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
};

export type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  type: string;
  location?: string;
  status: "Agendado" | "Concluído" | "Cancelado";
  notes?: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: "Baixa" | "Média" | "Alta";
  status: "Pendente" | "Concluída";
};
