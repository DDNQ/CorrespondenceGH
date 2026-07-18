import { useMemo, useState } from 'react'

import AdminMetricCard from '../../components/admin/AdminMetricCard'
import Modal from '../../components/common/Modal'
import PageHeader from '../../components/common/PageHeader'
import SectionCard from '../../components/common/SectionCard'
import StatusBadge from '../../components/common/StatusBadge'
import { offices as baseOffices } from '../../data/offices'
import { getUsers, roleOptions, saveUserRecord } from '../../data/users'

function UsersOfficesPage() {
  const [activeTab, setActiveTab] = useState('Users')
  const [users, setUsers] = useState(getUsers())
  const [offices, setOffices] = useState(baseOffices)
  const [userFilters, setUserFilters] = useState({
    search: '',
    role: 'All roles',
    office: 'All offices',
    status: 'Any status',
  })
  const [officeFilters, setOfficeFilters] = useState({
    search: '',
    status: 'Any status',
  })
  const [userForm, setUserForm] = useState(null)
  const [officeForm, setOfficeForm] = useState(null)

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const haystack = [user.fullName, user.email, user.officeName].join(' ').toLowerCase()
      const matchesSearch =
        !userFilters.search.trim() || haystack.includes(userFilters.search.trim().toLowerCase())
      const roleLabel =
        roleOptions.find((option) => option.value === user.role)?.label ?? user.role
      const matchesRole = userFilters.role === 'All roles' || roleLabel === userFilters.role
      const matchesOffice =
        userFilters.office === 'All offices' || user.officeName === userFilters.office
      const matchesStatus = userFilters.status === 'Any status' || user.status === userFilters.status

      return matchesSearch && matchesRole && matchesOffice && matchesStatus
    })
  }, [userFilters, users])

  const filteredOffices = useMemo(() => {
    return offices.filter((office) => {
      const haystack = [office.name, office.code].join(' ').toLowerCase()
      const matchesSearch =
        !officeFilters.search.trim() ||
        haystack.includes(officeFilters.search.trim().toLowerCase())
      const matchesStatus =
        officeFilters.status === 'Any status' || office.status === officeFilters.status

      return matchesSearch && matchesStatus
    })
  }, [officeFilters, offices])

  const handleSaveUser = () => {
    saveUserRecord(userForm)
    setUsers(getUsers())
    setUserForm(null)
  }

  const handleSaveOffice = () => {
    setOffices((current) => {
      const exists = current.some((office) => office.id === officeForm.id)

      if (exists) {
        return current.map((office) =>
          office.id === officeForm.id ? { ...office, ...officeForm } : office,
        )
      }

      return [officeForm, ...current]
    })
    setOfficeForm(null)
  }

  return (
    <section className="admin-page">
      <div className="admin-page-content">
        <PageHeader
          eyebrow="Administration"
          title="Users & Offices"
          description="Manage user accounts, passwords, roles, office assignments, access status, and office records."
          actions={
            <div className="admin-page-actions">
              <button
                type="button"
                className="button button--primary"
                onClick={() =>
                  activeTab === 'Users'
                    ? setUserForm({
                        id: `user-${Date.now()}`,
                        fullName: '',
                        email: '',
                        role: 'OFFICE_USER',
                        officeId: 'office-legal',
                        officeName: 'Legal Directorate',
                        status: 'Active',
                        password: 'Password123',
                        lastLogin: 'Not yet signed in',
                      })
                    : setOfficeForm({
                        id: `office-${Date.now()}`,
                        name: '',
                        code: '',
                        activeUsers: 0,
                        activeCorrespondence: 0,
                        overdue: 0,
                        status: 'Active',
                      })
                }
              >
                {activeTab === 'Users' ? 'Add User' : 'Add Office'}
              </button>
            </div>
          }
        />

        <div className="notice-strip admin-page-notice">
          Only system administrators may create accounts, reset passwords, change roles, change office assignments, activate or deactivate accounts, and manage office records.
        </div>

        <div className="tabs admin-tabs">
          {['Users', 'Offices'].map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? 'tab-button tab-button--active admin-tab-button' : 'tab-button admin-tab-button'}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Users' ? (
          <div className="summary-grid">
            <section className="admin-metric-grid admin-users-metrics">
              <AdminMetricCard label="Total Users" value={users.length} description="All system accounts" />
              <AdminMetricCard label="Active Users" value={users.filter((user) => user.status === 'Active').length} description="Can currently sign in" />
              <AdminMetricCard label="Administrators" value={users.filter((user) => user.role === 'SYSTEM_ADMIN').length} description="Full administrative access" />
              <AdminMetricCard label="Offices Represented" value={new Set(users.map((user) => user.officeId)).size} description="Across the Ministry" />
            </section>

            <SectionCard className="admin-section-card" title="System Users" description="Login accounts and the offices they represent.">
              <div className="filter-bar admin-user-filter-grid">
                <input
                  value={userFilters.search}
                  onChange={(event) => setUserFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Search user by name, email or office"
                />
                <select value={userFilters.role} onChange={(event) => setUserFilters((current) => ({ ...current, role: event.target.value }))}>
                  <option>All roles</option>
                  {roleOptions.map((option) => (
                    <option key={option.value}>{option.label}</option>
                  ))}
                </select>
                <select value={userFilters.office} onChange={(event) => setUserFilters((current) => ({ ...current, office: event.target.value }))}>
                  <option>All offices</option>
                  {offices.map((office) => (
                    <option key={office.id}>{office.name}</option>
                  ))}
                </select>
                <select value={userFilters.status} onChange={(event) => setUserFilters((current) => ({ ...current, status: event.target.value }))}>
                  <option>Any status</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
                <button type="button" className="button button--secondary" onClick={() => setUserFilters({ search: '', role: 'All roles', office: 'All offices', status: 'Any status' })}>
                  Reset
                </button>
              </div>

              <div className="table-card">
                <table className="admin-table admin-table--users">
                  <colgroup>
                    <col style={{ width: '23%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '13%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Office</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Account Control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="admin-user-cell">
                            <strong>{user.fullName}</strong>
                            <span className="muted-copy">{user.email}</span>
                          </div>
                        </td>
                        <td>{roleOptions.find((option) => option.value === user.role)?.label ?? user.role}</td>
                        <td>{user.officeName}</td>
                        <td><StatusBadge status={user.status} /></td>
                        <td>{user.lastLogin}</td>
                        <td>
                          <button type="button" className="button button--ghost admin-account-action" onClick={() => setUserForm({ ...user })}>
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {activeTab === 'Offices' ? (
          <div className="summary-grid">
            <section className="admin-metric-grid admin-users-metrics">
              <AdminMetricCard label="Total Offices" value={offices.length} description="Registered in the system" />
              <AdminMetricCard label="Active Offices" value={offices.filter((office) => office.status === 'Active').length} description="Currently operational" />
              <AdminMetricCard label="Total Users" value={users.length} description="Across all offices" />
              <AdminMetricCard label="Active Correspondence" value={offices.reduce((sum, office) => sum + office.activeCorrespondence, 0)} description="Across authorised offices" />
            </section>

            <SectionCard className="admin-section-card" title="Ministry Offices" description="Office records used for correspondence routing and visibility.">
              <div className="filter-bar admin-office-filter-grid">
                <input
                  value={officeFilters.search}
                  onChange={(event) => setOfficeFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Search office by name or code"
                />
                <select value={officeFilters.status} onChange={(event) => setOfficeFilters((current) => ({ ...current, status: event.target.value }))}>
                  <option>Any status</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
                <button type="button" className="button button--secondary" onClick={() => setOfficeFilters({ search: '', status: 'Any status' })}>
                  Reset
                </button>
              </div>

              <div className="table-card">
                <table className="admin-table admin-table--offices">
                  <thead>
                    <tr>
                      <th>Office</th>
                      <th>Code</th>
                      <th>Users</th>
                      <th>Active Correspondence</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOffices.map((office) => (
                      <tr key={office.id}>
                        <td>{office.name}</td>
                        <td>{office.code}</td>
                        <td>{office.activeUsers}</td>
                        <td>{office.activeCorrespondence}</td>
                        <td><StatusBadge status={office.status} /></td>
                        <td>
                          <button type="button" className="button button--ghost admin-account-action" onClick={() => setOfficeForm({ ...office })}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        ) : null}

        <Modal
          isOpen={Boolean(userForm)}
          title={userForm?.fullName ? 'Manage User Account' : 'Add User'}
          onClose={() => setUserForm(null)}
          actions={
            <>
              <button type="button" className="button button--secondary" onClick={() => setUserForm(null)}>
                Cancel
              </button>
              <button type="button" className="button button--primary" onClick={handleSaveUser}>
                Save Account
              </button>
            </>
          }
        >
          {userForm ? (
            <div className="form-grid form-grid--two app-form">
              <div className="form-field">
                <label>Full Name</label>
                <input value={userForm.fullName} onChange={(event) => setUserForm((current) => ({ ...current, fullName: event.target.value }))} />
              </div>
              <div className="form-field">
                <label>Email Address</label>
                <input value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} />
              </div>
              <div className="form-field">
                <label>Role</label>
                <select value={userForm.role} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value }))}>
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Office Assignment</label>
                <select
                  value={userForm.officeId}
                  onChange={(event) => {
                    const office = offices.find((item) => item.id === event.target.value)
                    setUserForm((current) => ({
                      ...current,
                      officeId: event.target.value,
                      officeName: office?.name ?? current.officeName,
                    }))
                  }}
                >
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>{office.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Account Status</label>
                <select value={userForm.status} onChange={(event) => setUserForm((current) => ({ ...current, status: event.target.value }))}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              <div className="form-field">
                <label>Temporary Password</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
                />
              </div>
            </div>
          ) : null}
        </Modal>

        <Modal
          isOpen={Boolean(officeForm)}
          title={officeForm?.name ? 'Edit Office' : 'Add Office'}
          onClose={() => setOfficeForm(null)}
          actions={
            <>
              <button type="button" className="button button--secondary" onClick={() => setOfficeForm(null)}>
                Cancel
              </button>
              <button type="button" className="button button--primary" onClick={handleSaveOffice}>
                Save Office
              </button>
            </>
          }
        >
          {officeForm ? (
            <div className="form-grid form-grid--two app-form">
              <div className="form-field">
                <label>Office Name</label>
                <input value={officeForm.name} onChange={(event) => setOfficeForm((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="form-field">
                <label>Office Code</label>
                <input value={officeForm.code} onChange={(event) => setOfficeForm((current) => ({ ...current, code: event.target.value }))} />
              </div>
              <div className="form-field">
                <label>Account or Routing Status</label>
                <select value={officeForm.status} onChange={(event) => setOfficeForm((current) => ({ ...current, status: event.target.value }))}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>
          ) : null}
        </Modal>
      </div>
    </section>
  )
}

export default UsersOfficesPage
