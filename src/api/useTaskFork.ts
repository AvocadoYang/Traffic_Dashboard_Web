import { useQuery } from '@tanstack/react-query';
import client from './axiosClient';
import { array, object, string, boolean, number, InferType } from 'yup';

const missionSchema = array(
  object({
    id: string().required('ID is required'),
    disable: boolean().required('Disable flag is required'),
    process_order: number().default(0).required('Process order is required'),
    operation: object({
      type: string().required('Operation type is required'),
      control: array(string().required()).required('Control array is required'),
      wait: number().optional(),
      is_define_id: string().required('ID definition is required'),
      locationId: number().required('Operation ID is required'),
      is_define_yaw: number().required('Yaw definition is required'),
      yaw: number().required('Yaw value is required'),
      tolerance: number().required('Tolerance is required'),
      lookahead: number().required('Lookahead is required'),

      waitOtherAmr: string().optional().nullable(),
      waitGenre: string().optional().nullable(),
      auto_preparatory_point: boolean().required('Preparatory point flag is required')
    }).required('Operation object is required'),
    io: object({
      fork: object({
        is_define_height: string().required('Height definition is required'),
        height: number().required('Height is required'),
        move: number().required('Move distance is required'),
        shift: number().required('Shift distance is required'),
        tilt: number().required('Tilt angle is required')
      }).required('Fork object is required'),
      camera: object({
        config: number().required('Camera config is required'),
        modify_dis: number().required('Modify distance is required')
      }).required('Camera object is required')
    }).required('IO object is required'),
    cargo_limit: object({
      load: number().required('Load limit is required'),
      offload: number().required('Offload limit is required')
    }).required('Cargo limit object is required'),
    mission_status: object({
      feedback_id: string().optional(),
      name: array(string().optional()).optional(),
      start: string().optional(),
      end: string().optional(),
      bookBlock: array(string().required()).nullable().required('Book block is required')
    }).required('Mission status object is required')
  }).optional()
).optional();

const getRelateTask = async (key: string) => {
  const { data } = await client.post<unknown>('api/setting/relative-task-fork', {
    key
  });
  const validatedData = await missionSchema.validate(data, { stripUnknown: true });
  return validatedData;
};

const useTaskFork = (key: string) => {
  return useQuery(['all-relate-task-fork', key], {
    queryFn: () => {
      return getRelateTask(key);
    },
    select: (data) => {
      if (!data) return [];
      const newData = [...data];
      return newData.sort((a, b) => (a?.process_order || 0) - (b?.process_order || 0));
    },
    staleTime: Infinity,
    refetchOnWindowFocus: 'always',
    refetchInterval: 2000
  });
};
export type TaskType = InferType<typeof missionSchema>;

export default useTaskFork;
