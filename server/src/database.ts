import * as sqlite from 'sqlite3'
import config from './config'
import sql, { SQLStatement } from 'sql-template-strings'
import * as crypto from 'crypto'
import * as argon2 from 'argon2'
import {
  PatchMetadata,
  Patch,
  User,
  UserLogin,
  UserRegistration,
} from '@modulate/common/types'

export const database = new (sqlite.verbose().Database)(config.databaseFile)

export const query = <T>(query: SQLStatement) => {
  return new Promise<T[]>((resolve, reject) =>
    database.all<T>(query.sql, query.values, (err, res) => {
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
  const [res] = await query<{ count: number }>(
    sql`SELECT COUNT(id) AS count FROM users WHERE username = ${username}`
  )

  return res?.count === 0
}

export const isEmailAvailable = async (email: string): Promise<boolean> => {
  const [res] = await query<{ count: number }>(
    sql`SELECT COUNT(id) AS count FROM users WHERE email = ${email}`
  )

  return res?.count === 0
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
  const [user] = await query<User & { password: string }>(sql`
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
  return query<{
    id: string
    name: string
    version: number
    createdAt: number
  }>(sql`
    SELECT id, name, version, createdAt
    FROM patches
    WHERE authorId = ${userId}
  `)
}

export const getLatestPatchVersion = async (
  patchId: string
): Promise<{ patch: Patch; metadata: PatchMetadata } | null> => {
  const [patch] = await query<{
    id: string
    patch: string
    name: string
    authorId: string
    authorName: string
    version: number
  }>(sql`
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
  const [latestVersion] = await query<{ version: number }>(sql`
    SELECT version FROM patches WHERE id = ${metadata.id} ORDER BY version DESC LIMIT 1
  `)

  const nextVersion = latestVersion?.version ?? 0 + 1

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

export type SampleMetadata = {
  id: string
  name: string
  ownerId: string
}

export const saveSampleMetadata = async (
  sampleMetadata: Omit<SampleMetadata, 'id'>
): Promise<SampleMetadata> => {
  const id = crypto.randomUUID()

  await query(sql`
    INSERT INTO samples (id, name, ownerId, createdAt)
    VALUES (
      ${id},
      ${sampleMetadata.name},
      ${sampleMetadata.ownerId},
      ${Date.now()}
    )
  `)

  return {
    id,
    ...sampleMetadata,
  }
}

export const getSampleMetadataById = async (id: string) => {
  const [sample] = await query<SampleMetadata>(
    sql`SELECT * FROM samples WHERE id = ${id}`
  )
  return sample ?? null
}

export const getSamplesByUser = async (userId: string) => {
  const samples = await query<SampleMetadata>(sql`
    SELECT * FROM samples WHERE ownerId = ${userId}
  `)

  return samples
}
