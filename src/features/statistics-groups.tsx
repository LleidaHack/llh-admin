import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  participantStatistics,
  type StatisticsParticipant,
} from "@/lib/event-statistics";

export function StatisticsGroups({
  participants,
}: {
  participants: StatisticsParticipant[];
}) {
  const [selected, setSelected] = useState<{
    field: string;
    label: string;
  } | null>(null);
  const categories = participantStatistics(participants);
  const category = categories.find((item) => item.field === selected?.field);
  const group = category?.groups.find((item) => item.label === selected?.label);
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {categories.map((category) => (
          <Card key={category.field}>
            <CardHeader>
              <CardTitle>{category.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {category.groups.length ? (
                <ul className="divide-y">
                  {category.groups.map((group) => (
                    <li
                      key={group.label}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <span className="min-w-0 break-words">{group.label}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="tabular-nums">
                          {group.participants.length}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Veure més: ${category.label} · ${group.label}`}
                          onClick={() =>
                            setSelected({
                              field: category.field,
                              label: group.label,
                            })
                          }
                        >
                          Veure més
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sense participants acceptats.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog
        open={!!group}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {category?.label} · {group?.label}
            </DialogTitle>
            <DialogDescription>
              {group?.participants.length ?? 0} participants acceptats. Es
              mostra la resposta original de cadascú.
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Correu</TableHead>
                <TableHead>Resposta original</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group?.participants.map((person) => (
                <TableRow key={person.id}>
                  <TableCell>
                    {person.name || person.nickname || `#${person.id}`}
                    {person.nickname && (
                      <span className="block text-xs text-muted-foreground">
                        {person.nickname}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="break-all">
                    {person.email || "—"}
                  </TableCell>
                  <TableCell className="whitespace-pre-wrap">
                    {String(
                      person[selected!.field as keyof StatisticsParticipant] ??
                        "",
                    ).trim() || "Sense especificar"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  );
}
