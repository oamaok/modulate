import path from 'path'
import sqlite from 'sqlite3'
import sql, { SQLStatement } from 'sql-template-strings'
import crypto from 'crypto'
import argon2 from 'argon2'
import {
  PatchMetadata,
  Patch,
  User,
  UserLogin,
  UserRegistration,
} from '@modulate/common/types'

export const database = new (sqlite.verbose().Database)(
  process.env.DATABASE_FILE ??
    path.resolve(__dirname, '../../data/database.sqlite3')
)

export const query = (query: SQLStatement) => {
  return new Promise<any[]>((resolve, reject) =>
    database.all(query.sql, query.values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  )
}

export const isUsernameAvailable = async (
  username: string
): Promise<boolean> => {
  const [{ count }] = await query(
    sql`SELECT COUNT(id) AS count FROM users WHERE username = ${username}`
  )

  return count === 0
}

export const isEmailAvailable = async (email: string): Promise<boolean> => {
  const [{ count }] = await query(
    sql`SELECT COUNT(id) AS count FROM users WHERE email = ${email}`
  )

  return count === 0
}

export const createUser = async (user: UserRegistration): Promise<User> => {
  const userId = crypto.randomUUID()

  await query(sql`
    INSERT INTO users (id, email, username, password, createdAt)
    VALUES (
      ${userId},
      ${user.email},
      ${user.username},
      ${await argon2.hash(user.password)},
      ${Date.now()}
    )  
  `)

  return { id: userId, username: user.username }
}

export const loginUser = async ({
  email,
  password,
}: UserLogin): Promise<User | null> => {
  const [user] = await query(sql`
    SELECT id, username, password FROM users WHERE email = ${email}
  `)

  if (!user) return null
  if (!(await argon2.verify(user.password, password))) return null

  return {
    id: user.id,
    username: user.username,
  }
}

export const getUserPatches = (userId: string) => {
  return query(sql`
    SELECT id, name, version, createdAt
    FROM patches
    WHERE authorId = ${userId}
  `)
}

export const getLatestPatchVersion = async (
  patchId: string
): Promise<{ patch: Patch; metadata: PatchMetadata } | null> => {
  const [patch] = await query(sql`
    SELECT patches.id AS id, patch, name, users.id AS authorId, users.username AS authorName, version
    FROM patches
    JOIN users ON users.id = patches.authorId
    WHERE patches.id = ${patchId}
    ORDER BY version DESC
    LIMIT 1
  `)

  if (!patch) return null

  return {
    metadata: {
      id: patch.id,
      name: patch.name,
      author: {
        id: patch.authorId,
        username: patch.authorName,
      },
    },
    patch: JSON.parse(patch.patch),
  }
}

export const getPatchVersion = (patchId: string, version: number) => {
  return query(sql`
    SELECT id, patch, name version, createdAt
    FROM patches
    WHERE id = ${patchId} AND version = ${version}
  `)
}
export const saveNewPatch = async (
  userId: string,
  metadata: PatchMetadata,
  patch: Patch
) => {
  const patchId = crypto.randomUUID()

  const res = await query(sql`
    INSERT INTO patches (id, name, authorId, createdAt, patch)
    VALUES (${patchId}, ${
    metadata.name
  }, ${userId}, ${Date.now()}, ${JSON.stringify(patch)})
  `)

  return { id: patchId, version: 0 }
}

export const savePatchVersion = async (
  userId: string,
  metadata: PatchMetadata,
  patch: Patch
) => {
  const [latestVersion] = await query(sql`
    SELECT version FROM patches WHERE id = ${metadata.id} ORDER BY version DESC LIMIT 1
  `)

  const nextVersion = latestVersion.version + 1

  await query(sql`
    INSERT INTO patches (id, version, name, authorId, createdAt, patch)
    VALUES (
      ${metadata.id},
      ${nextVersion},
      ${metadata.name},
      ${userId},
      ${Date.now()},
      ${JSON.stringify(patch)}
    )
  `)
  return { id: metadata.id, version: nextVersion }
}
