import { useQuery } from '@tanstack/react-query'
import { array, boolean, number, object, string } from 'yup'
import client from './axiosClient'

const getShelvesInfo = async () => {
  const { data } = await client.get<unknown>('api/missions/quick-mission')

  const schema = array(
    object({
      columnName: string().optional().nullable(),
      level: number().required(),
      locationId: string().required(),
      hasCargo: boolean().required()
    })
  ).required()

  // console.log(data)

  const validatedData = await schema.validate(data, {
    stripUnknown: true
  })
  return validatedData
}

const useShelvesInfo = () => {
  return useQuery(['t123est'], getShelvesInfo)
}

export default useShelvesInfo
