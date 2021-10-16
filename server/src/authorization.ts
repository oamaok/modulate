import jwt from 'jsonwebtoken'
import * as validators from '../../common/validators'
import { User } from '../../common/types'

const key = process.env.JWT_KEY ?? 'development key'

export const createToken = (user: User): string => {
  return jwt.sign(user, key)
}

export const verifyToken = (token: string): User | null => {
  try {
    const res = validators.User.decode(jwt.verify(token, key))
    if (res._tag === 'Right') {
      return res.right
    }
    return null
  } catch (err) {
    return null
  }
}
