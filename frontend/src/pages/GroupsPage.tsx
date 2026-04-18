import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiClientError, Group, GroupMember, User, apiClient } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

interface GroupWithDetails {
  group: Group;
  members: GroupMember[];
  memberCount: number;
}

function errorToText(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.payload?.message ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unexpected error occurred.';
}

export default function GroupsPage() {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedGroupId = searchParams.get('id');

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithDetails | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  const [selectedPhoneToAdd, setSelectedPhoneToAdd] = useState('');
  const [updatingRoleForMemberId, setUpdatingRoleForMemberId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const auth = { token: session?.token };

  // Load initial data
  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        const [groupsData, usersData] = await Promise.all([
          apiClient.fetchGroups(auth),
          apiClient.fetchUsers(auth),
        ]);
        setGroups(groupsData);
        setAllUsers(usersData);
      } catch (err) {
        setError(errorToText(err));
      } finally {
        setLoading(false);
      }
    };

    void loadInitial();
  }, [session?.token]);

  // Load group details when selected
  useEffect(() => {
    if (!selectedGroupId) {
      setSelectedGroup(null);
      return;
    }

    const loadGroupDetails = async () => {
      try {
        setError(null);
        const group = groups.find((g) => g.id === selectedGroupId);
        if (!group) return;

        const members = await apiClient.fetchGroupMembers(selectedGroupId, auth);
        setSelectedGroup({
          group,
          members,
          memberCount: members.length,
        });
      } catch (err) {
        setError(errorToText(err));
      }
    };

    void loadGroupDetails();
  }, [selectedGroupId, groups, session?.token]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setError('Group name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      const newGroup = await apiClient.createGroup(newGroupName.trim(), auth);
      setGroups((prev) => [newGroup, ...prev]);
      setNewGroupName('');
      setNewGroupDescription('');
      setSearchParams({ id: newGroup.id });
      setSuccessMessage('Group created successfully.');
    } catch (err) {
      setError(errorToText(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) {
      setError('Select a group first.');
      return;
    }
    if (!selectedUserToAdd) {
      setError('Select a user to add.');
      return;
    }
    if (!selectedPhoneToAdd) {
      setError('Select a contact number for the user.');
      return;
    }

    try {
      setAddingMember(true);
      setError(null);
      setSuccessMessage(null);
      await apiClient.addGroupMember(selectedGroupId, selectedUserToAdd, selectedPhoneToAdd, 'MEMBER', auth);
      setSelectedUserToAdd('');
      setSelectedPhoneToAdd('');

      // Refresh group details
      const members = await apiClient.fetchGroupMembers(selectedGroupId, auth);
      setSelectedGroup((prev) =>
        prev
          ? {
              ...prev,
              members,
              memberCount: members.length,
            }
          : null,
      );
      setSuccessMessage('Member added successfully.');
    } catch (err) {
      setError(errorToText(err));
    } finally {
      setAddingMember(false);
    }
  };

  const handleMakeAdmin = async (memberId: string) => {
    if (!selectedGroupId) {
      setError('Select a group first.');
      return;
    }

    try {
      setUpdatingRoleForMemberId(memberId);
      setError(null);
      setSuccessMessage(null);
      await apiClient.updateGroupMemberRole(selectedGroupId, memberId, 'ADMIN', auth);
      const members = await apiClient.fetchGroupMembers(selectedGroupId, auth);
      setSelectedGroup((prev) =>
        prev
          ? {
              ...prev,
              members,
              memberCount: members.length,
            }
          : null,
      );
      setSuccessMessage('Member promoted to admin successfully.');
    } catch (err) {
      setError(errorToText(err));
    } finally {
      setUpdatingRoleForMemberId(null);
    }
  };

  const handleDemoteAdmin = async (memberId: string, memberUserId: string) => {
    if (!selectedGroupId) {
      setError('Select a group first.');
      return;
    }

    // Prevent demoting yourself if you're the last admin
    if (memberUserId === session?.userId) {
      const members = selectedGroup?.members || [];
      const adminCount = members.filter((m) => m.role === 'ADMIN').length;
      if (adminCount === 1) {
        setError('You cannot demote yourself as the last admin of the group.');
        return;
      }
    }

    try {
      setUpdatingRoleForMemberId(memberId);
      setError(null);
      setSuccessMessage(null);
      await apiClient.updateGroupMemberRole(selectedGroupId, memberId, 'MEMBER', auth);
      const members = await apiClient.fetchGroupMembers(selectedGroupId, auth);
      setSelectedGroup((prev) =>
        prev
          ? {
              ...prev,
              members,
              memberCount: members.length,
            }
          : null,
      );
      setSuccessMessage('Member demoted from admin successfully.');
    } catch (err) {
      setError(errorToText(err));
    } finally {
      setUpdatingRoleForMemberId(null);
    }
  };

  const currentUserMembership = selectedGroup?.members.find((member) => member.userId === session?.userId);
  const isGroupAdmin = currentUserMembership?.role === 'ADMIN';

  // Get users not already in group
  const usersNotInGroup = allUsers.filter(
    (user) => !selectedGroup?.members.some((member) => member.userId === user.id),
  );

  const phonesForSelectedUser = allUsers.find((user) => user.id === selectedUserToAdd)?.phones ?? [];

  if (loading) {
    return <div className="page-content">Loading groups...</div>;
  }

  return (
    <div className="page-content">
      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      <div className="groups-container">
        {/* Groups List Sidebar */}
        <div className="groups-sidebar">
          <section className="page-section">
            <h2>Create Group</h2>
            <form onSubmit={handleCreateGroup} className="form-group">
              <div className="form-row">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name"
                  disabled={saving}
                />
              </div>
              <div className="form-row">
                <input
                  type="text"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Description (optional)"
                  disabled={saving}
                />
              </div>
              <button type="submit" disabled={saving}>
                {saving ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          </section>

          <section className="page-section">
            <h2>Your Groups</h2>
            {groups.length === 0 ? (
              <p className="empty-state">No groups yet. Create one!</p>
            ) : (
              <div className="groups-list-sidebar">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    className={`group-list-item ${selectedGroupId === group.id ? 'active' : ''}`}
                    onClick={() => setSearchParams({ id: group.id })}
                  >
                    <h4>{group.name}</h4>
                    <p className="text-muted">View details</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Group Details */}
        <div className="groups-main">
          {selectedGroup ? (
            <>
              <section className="page-section">
                <h2>{selectedGroup.group.name}</h2>
                <div className="group-header">
                  <div className="group-stat">
                    <span className="stat-label">Members</span>
                    <span className="stat-value">{selectedGroup.memberCount}</span>
                  </div>
                  <div className="group-stat">
                    <span className="stat-label">Created</span>
                    <span className="stat-value">{new Date(selectedGroup.group.createdAt).toLocaleDateString()}</span>
                  </div>
                  {isGroupAdmin && (
                    <div className="group-badge">👑 Admin</div>
                  )}
                </div>
              </section>

              {/* Members Section */}
              <section className="page-section">
                <h2>Members</h2>
                {isGroupAdmin && usersNotInGroup.length > 0 && (
                  <form onSubmit={handleAddMember} className="member-add-form">
                    <div className="form-row">
                      <select
                        value={selectedUserToAdd}
                        onChange={(e) => {
                          const nextUserId = e.target.value;
                          setSelectedUserToAdd(nextUserId);
                          const nextUserPhones = allUsers.find((user) => user.id === nextUserId)?.phones ?? [];
                          setSelectedPhoneToAdd(nextUserPhones[0]?.id ?? '');
                        }}
                        disabled={addingMember}
                      >
                        <option value="">Select user to add...</option>
                        {usersNotInGroup.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedPhoneToAdd}
                        onChange={(e) => setSelectedPhoneToAdd(e.target.value)}
                        disabled={addingMember || !selectedUserToAdd || phonesForSelectedUser.length === 0}
                      >
                        <option value="">Select contact number...</option>
                        {phonesForSelectedUser.map((phone) => (
                          <option key={phone.id} value={phone.id}>
                            {phone.number}{phone.label ? ` (${phone.label})` : ''}
                          </option>
                        ))}
                      </select>
                      <button type="submit" disabled={addingMember}>
                        {addingMember ? 'Adding...' : 'Add Member'}
                      </button>
                    </div>
                    {selectedUserToAdd && phonesForSelectedUser.length === 0 && (
                      <p className="text-muted text-small">Selected user has no contact numbers saved.</p>
                    )}
                  </form>
                )}

                <div className="members-list">
                  {selectedGroup.members.map((member) => (
                    <div key={member.id} className="member-card">
                      <div className="member-info">
                        <h4>{member.user.name}</h4>
                        <p className="text-muted">{member.user.email}</p>
                        {member.selectedPhone?.number && (
                          <p className="text-muted text-small">
                            Contact: {member.selectedPhone.number}
                            {member.selectedPhone.label ? ` (${member.selectedPhone.label})` : ''}
                          </p>
                        )}
                        {member.role === 'ADMIN' && <span className="badge">Admin</span>}
                      </div>
                      <div className="member-actions">
                        <p className="text-muted text-small">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                        {isGroupAdmin && (
                          <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end' }}>
                            {member.role === 'MEMBER' ? (
                              <button
                                type="button"
                                className="promote-admin-btn"
                                onClick={() => handleMakeAdmin(member.userId)}
                                disabled={updatingRoleForMemberId === member.userId}
                              >
                                {updatingRoleForMemberId === member.userId ? 'Updating...' : 'Make Admin'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="demote-admin-btn"
                                onClick={() => handleDemoteAdmin(member.userId, member.userId)}
                                disabled={updatingRoleForMemberId === member.userId}
                              >
                                {updatingRoleForMemberId === member.userId ? 'Updating...' : 'Remove Admin'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="page-section empty-state-section">
              <p>Select a group to view details and manage members.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
