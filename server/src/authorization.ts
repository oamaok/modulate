import * as jwt from 'jsonwebtoken'
import * as validators from '@modulate/common/type-validators'
import config from './config'
import { User } from '@modulate/common/types'

export const createToken = (user: User): string => {
  return jwt.sign(user, config.jwtKey)
}

export const verifyToken = (token: string): User | null => {
  try {
    const res = validators.User.decode(jwt.verify(token, config.jwtKey))
    if (res._tag === 'Right') {
      return res.right
    }
    return null
  } catch (err) {
    return null
  }
}
