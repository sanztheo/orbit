@AGENTS.md

## Design System

All UI must follow these rules:

### Font
- Geist Sans (already wired via next/font/google in layout.tsx → --font-geist-sans CSS var)

### Icons
- Use lucide-react for ALL icons (already a dep). Never use emoji as icons in code.
- Common: ArrowLeft, Plus, Pencil, Trash2, Save, Loader2, Search, X, ChevronRight
- Nav: LayoutDashboard, Users, Briefcase, CheckSquare, BookOpen, Settings2
- Data: Mail, Phone, Building2, Calendar, Clock, Bell, Star, Tag, Link2

### Components (shadcn/ui only)
- Forms: <Input> <Select>/<SelectTrigger>/<SelectValue>/<SelectContent>/<SelectItem> <Textarea> <Label>
- Actions: <Button variant="default|outline|ghost|destructive" size="sm|default|icon">
- Layout: <Card>/<CardHeader>/<CardTitle>/<CardDescription>/<CardContent>/<CardFooter>
- Feedback: <Badge> <Skeleton> <Separator> <Tooltip>
- Never use raw <input>, <select>, <textarea>, <button> in page/component files

### Loading states
- Buttons: <Loader2 className="h-4 w-4 mr-2 animate-spin" /> before label text
- Sections: <Skeleton className="h-8 w-full" /> grid placeholders
