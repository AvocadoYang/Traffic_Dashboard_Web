export type OutputForm = {
  is_active: boolean;
  cargo_number: number;
  respawn_cargo: boolean;
  output_cargo_speed: number;
  specify_car: string[];
  placement: string[];
};

export type InputForm = {
  is_active: boolean;
  shift_locations: string;
  input_cargo_speed: number;
};
