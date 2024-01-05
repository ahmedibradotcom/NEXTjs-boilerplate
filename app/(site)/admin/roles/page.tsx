'use client'

import React, { useState, useEffect, FormEvent } from 'react'
import dynamic from 'next/dynamic'
import { useForm } from 'react-hook-form'
import useApi from '@/hooks/useApi'
import useAuthorization from '@/hooks/useAuthorization'
import { useRouter } from 'next/navigation'
import type {
  Permission as IPermission,
  ClientPermission as IClientPermission,
} from '@prisma/client'
import Message from '@/components/Message'
import FormView from '@/components/FormView'
import Spinner from '@/components/Spinner'
import RTable from '@/components/RTable'

import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Form } from '@/components/ui/form'
import CustomFormField from '@/components/ui/CustomForm'
import useEditStore from '@/zustand/editStore'
import { useColumn } from './hook/useColumn'
import { TopLoadingBar } from '@/components/TopLoadingBar'

const FormSchema = z.object({
  name: z.string().refine((value) => value !== '', {
    message: 'Name is required',
  }),
  description: z.string().optional(),
  permissions: z
    .array(z.string())
    .refine((value) => value.some((item) => item), {
      message: 'You have to select at least one item.',
    }),
  clientPermissions: z
    .array(z.string())
    .refine((value) => value.some((item) => item), {
      message: 'You have to select at least one item.',
    }),
})

const Page = () => {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [id, setId] = useState<string | null>(null)
  const { edit, setEdit } = useEditStore((state) => state)
  const [q, setQ] = useState('')

  const path = useAuthorization()
  const router = useRouter()

  useEffect(() => {
    if (path) {
      router.push(path)
    }
  }, [path, router])

  const getApi = useApi({
    key: ['roles'],
    method: 'GET',
    url: `roles?page=${page}&q=${q}&limit=${limit}`,
  })?.get

  const postApi = useApi({
    key: ['roles'],
    method: 'POST',
    url: `roles`,
  })?.post

  const updateApi = useApi({
    key: ['roles'],
    method: 'PUT',
    url: `roles`,
  })?.put

  const deleteApi = useApi({
    key: ['roles'],
    method: 'DELETE',
    url: `roles`,
  })?.deleteObj

  const getClientPermissionsApi = useApi({
    key: ['client-permissions'],
    method: 'GET',
    url: `client-permissions?page=${page}&q=${q}&limit=${250}`,
  })?.get

  const getPermissionsApi = useApi({
    key: ['permissions'],
    method: 'GET',
    url: `permissions?page=${page}&q=${q}&limit=${250}`,
  })?.get

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
      clientPermissions: [],
    },
  })

  useEffect(() => {
    if (postApi?.isSuccess || updateApi?.isSuccess || deleteApi?.isSuccess) {
      formCleanHandler()
      getApi?.refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postApi?.isSuccess, updateApi?.isSuccess, deleteApi?.isSuccess])

  useEffect(() => {
    getApi?.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    if (!q) getApi?.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const searchHandler = (e: FormEvent) => {
    e.preventDefault()
    getApi?.refetch()
    setPage(1)
  }

  interface CheckboxListItem {
    label: string
    children: Array<{
      id: string
      label: string
      method?: string
      path?: string
    }>
  }

  const permissionsList = (items: IPermission[]): CheckboxListItem[] =>
    items?.reduce((acc: CheckboxListItem[], curr: IPermission) => {
      const found = acc.find((item) => item.label === curr.name)
      if (found) {
        found.children.push({
          id: curr.id,
          label: curr.description || '',
          method: curr.method,
        })
      } else {
        acc.push({
          label: curr.name,
          children: [
            {
              id: curr.id,
              label: curr.description || '',
              method: curr.method,
            },
          ],
        })
      }
      return acc
    }, [])

  const clientPermissionsList = (
    items: IClientPermission[]
  ): CheckboxListItem[] =>
    items?.reduce((acc: CheckboxListItem[], curr: IClientPermission) => {
      const found = acc.find((item) => item.label === curr.menu)
      if (found) {
        found.children.push({
          id: curr.id,
          label: curr.description || '',
          path: curr.path,
        })
      } else {
        acc.push({
          label: curr.menu,
          children: [
            {
              id: curr.id,
              label: curr.description || '',
              path: curr.path,
            },
          ],
        })
      }
      return acc
    }, [])

  const refEdit = React.useRef(edit)
  const refId = React.useRef(id)

  const editHandler = (
    item: IClientPermission & {
      role: { id: string }
      permissions: IPermission[]
      clientPermissions: IClientPermission[]
    }
  ) => {
    setId(item.id!)
    setEdit(true)

    refEdit.current = true
    refId.current = item.id!

    form.setValue('name', item?.name)
    form.setValue('description', item?.description || '')

    form.setValue(
      'permissions',
      item?.permissions?.map((item) => item?.id)
    )
    form.setValue(
      'clientPermissions',
      item?.clientPermissions?.map((item) => item?.id)
    )
  }

  const deleteHandler = (id: any) => deleteApi?.mutateAsync(id)

  const label = 'Role'
  const modal = 'role'

  const formCleanHandler = () => {
    form.reset()
    setEdit(false)
    setId(null)
    refEdit.current = false
    refId.current = null
    getClientPermissionsApi?.refetch()
    getPermissionsApi?.refetch()

    window.document.getElementById('dialog-close')?.click()
  }

  const formFields = (
    <Form {...form}>
      <CustomFormField
        form={form}
        name='name'
        label='Name'
        placeholder='Name'
        type='text'
      />
      <CustomFormField
        form={form}
        label='Permission'
        name='permissions'
        placeholder='Permission'
        items={permissionsList(getPermissionsApi?.data?.data || [])}
        fieldType='multipleCheckbox'
        data={[]}
      />

      <CustomFormField
        form={form}
        name='description'
        label='Description'
        placeholder='Description'
        cols={3}
        rows={3}
      />

      <CustomFormField
        form={form}
        label='Client Permission'
        name='clientPermissions'
        placeholder='Client Permission'
        items={clientPermissionsList(getClientPermissionsApi?.data?.data || [])}
        fieldType='multipleCheckbox'
        data={[]}
      />
    </Form>
  )

  const onSubmit = (values: z.infer<typeof FormSchema>) => {
    refEdit.current
      ? updateApi?.mutateAsync({
          ...values,
          id: refId.current,
        })
      : postApi?.mutateAsync({
          ...values,
          id: refId.current,
        })
  }

  const formChildren = (
    <FormView
      formCleanHandler={formCleanHandler}
      form={formFields}
      loading={updateApi?.isPending || postApi?.isPending}
      handleSubmit={form.handleSubmit}
      submitHandler={onSubmit}
      label={label}
    />
  )

  const { columns } = useColumn({
    editHandler,
    isPending: deleteApi?.isPending || false,
    deleteHandler,
    formChildren,
  })

  return (
    <>
      {deleteApi?.isSuccess && (
        <Message value={`${label} has been cancelled successfully.`} />
      )}
      {deleteApi?.isError && <Message value={deleteApi?.error} />}
      {updateApi?.isSuccess && <Message value={updateApi?.data?.message} />}
      {updateApi?.isError && <Message value={updateApi?.error} />}
      {postApi?.isSuccess && <Message value={postApi?.data?.message} />}
      {postApi?.isError && <Message value={postApi?.error} />}

      <TopLoadingBar isFetching={getApi?.isFetching || getApi?.isPending} />

      {getApi?.isPending ? (
        <Spinner />
      ) : getApi?.isError ? (
        <Message value={getApi?.error} />
      ) : (
        <div className='overflow-x-auto bg-white p-3 mt-2'>
          <RTable
            data={getApi?.data}
            columns={columns}
            setPage={setPage}
            setLimit={setLimit}
            limit={limit}
            q={q}
            setQ={setQ}
            searchHandler={searchHandler}
            modal={modal}
            caption='Roles List'
          >
            {formChildren}
          </RTable>
        </div>
      )}
    </>
  )
}

export default dynamic(() => Promise.resolve(Page), {
  ssr: false,
})
