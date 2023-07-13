import * as crypto from 'crypto'
import * as jwt from 'jsonwebtoken'
import * as fs from 'fs'
import * as validators from '@modulate/common/validators'
import config from './config'
import { User } from '@modulate/common/types'

try {
  fs.statSync(config.jwtKeyFile)
} catch (err) {
  fs.writeFileSync(config.jwtKeyFile, crypto.randomBytes(256))
}
const key = fs.readFileSync(config.jwtKeyFile)

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
