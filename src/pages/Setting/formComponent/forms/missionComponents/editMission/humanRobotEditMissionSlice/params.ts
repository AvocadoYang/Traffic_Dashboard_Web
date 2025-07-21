export const jointLimits = [
  { jointName: 'L_HIP_PITCH', limitRad: -2.3107, limitRad2: 2.8798 },
  { jointName: 'L_HIP_ROLL', limitRad: -0.532, limitRad2: 2.8971 },
  { jointName: 'L_HIP_YAW', limitRad: -2.757, limitRad2: 2.757 },
  { jointName: 'L_KNEE', limitRad: -0.087207, limitRad2: 2.8798 },
  { jointName: 'L_ANKLE_PITCH', limitRad: -0.8727, limitRad2: 0.5236 },
  { jointName: 'L_ANKLE_ROLL', limitRad: -0.2618, limitRad2: 0.2618 },
  { jointName: 'R_HIP_PITCH', limitRad: -2.3107, limitRad2: 2.8798 },
  { jointName: 'R_HIP_ROLL', limitRad: -2.8971, limitRad2: 0.532 },
  { jointName: 'R_HIP_YAW', limitRad: -2.757, limitRad2: 2.757 },
  { jointName: 'R_KNEE', limitRad: -0.087207, limitRad2: 2.8798 },
  { jointName: 'R_ANKLE_PITCH', limitRad: -0.8727, limitRad2: 0.5236 },
  { jointName: 'R_ANKLE_ROLL', limitRad: -0.2618, limitRad2: 0.2618 },
  { jointName: 'WAIST_YAW', limitRad: -2.618, limitRad2: 2.618 },
  { jointName: 'WAIST_ROLL', limitRad: -0.53, limitRad2: 0.53 },
  { jointName: 'WAIST_PITCH', limitRad: -0.53, limitRad2: 0.53 },
  { jointName: 'L_SHOULDER_PITCH', limitRad: -3.0892, limitRad2: 2.8798 },
  { jointName: 'L_SHOULDER_ROLL', limitRad: -1.5882, limitRad2: 2.315 },
  { jointName: 'L_SHOULDER_YAW', limitRad: -2.618, limitRad2: 2.618 },
  { jointName: 'L_ELBOW', limitRad: -1.0472, limitRad2: 2.0944 },
  { jointName: 'L_WRIST_ROLL', limitRad: -1.9722220944, limitRad2: 1.9722220944 },
  { jointName: 'L_WRIST_PITCH', limitRad: -1.614429558, limitRad2: 1.614429558 },
  { jointName: 'L_WRIST_YAW', limitRad: -1.614429558, limitRad2: 1.614429558 },
  { jointName: 'R_SHOULDER_PITCH', limitRad: -3.0892, limitRad2: 2.8798 },
  { jointName: 'R_SHOULDER_ROLL', limitRad: -2.315, limitRad2: 1.5882 },
  { jointName: 'R_SHOULDER_YAW', limitRad: -2.618, limitRad2: 2.618 },
  { jointName: 'R_ELBOW', limitRad: -1.0472, limitRad2: 2.0944 },
  { jointName: 'R_WRIST_ROLL', limitRad: -1.9722220944, limitRad2: 1.9722220944 },
  { jointName: 'R_WRIST_PITCH', limitRad: -1.614429558, limitRad2: 1.614429558 },
  { jointName: 'R_WRIST_YAW', limitRad: -1.614429558, limitRad2: 1.614429558 }
] as const;

export const robotType = ['move', 'load', 'offload', 'upper_control'] as const;

export const robotControl = ['Forward', 'Backward', 'Spin'] as const;
export const robotUpperControl = [
  'two-hand-heart',
  'single-hand-heart',
  'single-palm-heart',
  'finger-heart',
  'single-palm-heart-open',
  'YA',
  'hold hands',
  'YA+hold hands'
] as const;
