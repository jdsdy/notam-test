import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MemberWithProfile } from "@/lib/organisations";

function MemberTable({
  title,
  description,
  members,
}: {
  title: string;
  description: string;
  members: MemberWithProfile[];
}) {
  return (
    <div className="space-y-2">
      <div>
        <h3 className="font-heading text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members in this group.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.user_id}>
                <TableCell className="font-medium">{m.full_name}</TableCell>
                <TableCell className="font-mono text-xs">{m.email}</TableCell>
                <TableCell>{m.role || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default function OrgMembersTables({ members }: { members: MemberWithProfile[] }) {
  const admins = members.filter((m) => m.is_admin);
  const others = members.filter((m) => !m.is_admin);

  return (
    <div className="space-y-10">
      <MemberTable
        title="Administrators"
        description="Members who can administer this organisation."
        members={admins}
      />
      <MemberTable
        title="Members"
        description="Organisation members without the administrator flag."
        members={others}
      />
    </div>
  );
}
