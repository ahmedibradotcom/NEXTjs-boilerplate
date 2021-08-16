import nc from 'next-connect'
import db from '../../../../utils/db'
import User from '../../../../models/User'
import { generateToken, isAuth, isAdmin } from '../../../../utils/auth'

const handler = nc()
handler.use(isAuth, isAdmin)

handler.get(async (req, res) => {
  await db.connect()
  let query = User.find()

  const page = parseInt(req.query.page) || 1
  const pageSize = parseInt(req.query.limit) || 50
  const skip = (page - 1) * pageSize
  const total = await User.countDocuments()

  const pages = Math.ceil(total / pageSize)

  query = query
    .skip(skip)
    .limit(pageSize)
    .sort({ createdAt: -1 })
    .select('-password')

  const result = await query

  await db.disconnect()

  res.status(200).json({
    startIndex: skip + 1,
    endIndex: skip + result.length,
    count: result.length,
    page,
    pages,
    total,
    data: result,
  })
})

handler.post(async (req, res) => {
  await db.connect()

  const { name, email, password, group } = req.body
  const userExist = await User.findOne({ email })
  if (userExist) {
    res.status(400)
    throw new Error('User already exist')
  }

  const userCreate = await User.create({
    name,
    email,
    password,
    group,
  })
  await db.disconnect()

  if (userCreate) {
    res.status(201).json({
      _id: userCreate._id,
      name: userCreate.name,
      email: userCreate.email,
      group: userCreate.group,
      token: generateToken(userCreate._id),
    })
  } else {
    res.status(400)
    throw new Error('Invalid user data')
  }
})

export default handler
