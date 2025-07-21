import { t } from 'i18next';

export const locationOption = (value) => {
  switch (value) {
    case 'Elevator':
      return t('edit_location_panel.elevator');
    case 'RoboticArm':
      return t('edit_location_panel.roboticArm');
    case 'Conveyor':
      return t('edit_location_panel.conveyor');
    case 'LiftGate':
      return t('edit_location_panel.liftGate');
    case 'Palletizer':
      return t('edit_location_panel.palletizer');
    case 'Charging':
      return t('edit_location_panel.Charging');
    case 'Dispatch':
      return t('edit_location_panel.Dispatch');
    case 'Standby':
      return t('edit_location_panel.Standby');
    case 'Storage':
      return t('edit_location_panel.Storage');
    default:
      return value;
  }
};
