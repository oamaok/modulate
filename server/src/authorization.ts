import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import * as fs from 'fs'
import * as path from 'path'
import * as validators from '@modulate/common/validators'
import { User } from '@modulate/common/types'

const keyFile =
  process.env.JWT_KEY_FILE ?? path.resolve(__dirname, '../../data/jwt.key')

try {
  fs.statSync(keyFile)
} catch (err) {
  fs.writeFileSync(keyFile, crypto.randomBytes(256))
}
const key = fs.readFileSync(keyFile)

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
