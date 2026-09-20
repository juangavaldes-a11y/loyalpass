'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { portalApi } from '@/lib/api/http';
import styles from '@/app/portal.module.css';

async function getTeam() {
  return (await portalApi.get('/client/team')).data;
}

async function updateTeamMember(payload) {
  return (await portalApi.put('/client/team', payload)).data;
}

export default function ClientTeamPanel() {
  const queryClient = useQueryClient();
  const teamQuery = useQuery({ queryKey: ['client', 'team'], queryFn: getTeam });
  const updateMember = useMutation({ mutationFn: updateTeamMember, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client', 'team'] }) });
  const members = teamQuery.data?.data || [];

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}><div><h2>Team access</h2><p className={styles.mutedText}>Client owners can manage active team members and roles.</p></div></div>
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead><tbody>
        {members.length === 0 ? <tr><td colSpan="4">No team members found.</td></tr> : members.map((member) => <tr key={member.id}>
          <td>{member.email}</td><td><select aria-label={`Role for ${member.email}`} value={member.role} onChange={(event) => updateMember.mutate({ userId: member.id, role: event.target.value })} disabled={updateMember.isPending}><option value="client_owner">Owner</option><option value="client_staff">Staff</option></select></td><td>{member.active ? 'Active' : 'Inactive'}</td>
          <td><button type="button" onClick={() => updateMember.mutate({ userId: member.id, active: !member.active })} disabled={updateMember.isPending}>{member.active ? 'Deactivate' : 'Activate'}</button></td>
        </tr>)}
      </tbody></table></div>
      {teamQuery.error ? <p className={styles.status} aria-live="polite">{teamQuery.error.message}</p> : null}
    </section>
  );
}