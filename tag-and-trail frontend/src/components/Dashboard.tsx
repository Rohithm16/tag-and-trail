import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { motion } from 'framer-motion';
import { 
  FileText, Link as LinkIcon, Lock, Globe, AlertTriangle, 
  ArrowRight, File, LogOut, Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

const stats = {
  totalIndexed: 342,
  links: 128,
  documents: 214,
  types: { open: 156, private: 142, malicious: 44 },
};

const recentActivity = [
  { id: 1, title: 'Project Proposal', type: 'pdf', tags: ['work', 'proposal'], date: '2025-03-20', isMalicious: false },
  { id: 2, title: 'Research Paper', type: 'link', tags: ['research', 'AI'], date: '2025-03-19', isMalicious: false },
  { id: 3, title: 'Suspicious Link', type: 'link', tags: ['spam', 'malware'], date: '2025-03-18', isMalicious: true },
  { id: 4, title: 'Meeting Notes', type: 'pdf', tags: ['meeting', 'notes'], date: '2025-03-17', isMalicious: false },
];

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  const filteredActivity = recentActivity.filter(item => {
    const matchesSearch = item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' ? true :
      filterType === 'pdf' ? item.type === 'pdf' :
      filterType === 'link' ? item.type === 'link' :
      filterType === 'malicious' ? item.isMalicious : true;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-[linear-gradient(to_bottom_right,#f8fafc,#eef6ff)] text-slate-950">
      <div className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <span className="bg-gradient-to-r from-sky-600 to-cyan-500 bg-clip-text text-2xl font-bold font-serif text-transparent">
              Tag & Trail
            </span>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by tags..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button variant={filterType === 'all' ? 'primary' : 'outline'} size="sm" onClick={() => setFilterType('all')}>All</Button>
            <Button variant={filterType === 'pdf' ? 'primary' : 'outline'} size="sm" onClick={() => setFilterType('pdf')}>PDF</Button>
            <Button variant={filterType === 'link' ? 'primary' : 'outline'} size="sm" onClick={() => setFilterType('link')}>Link</Button>
            <Button variant={filterType === 'malicious' ? 'primary' : 'outline'} size="sm" onClick={() => setFilterType('malicious')}>Malicious</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-lg text-slate-500">Indexed Items</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="text-4xl font-bold">{stats.totalIndexed}</div>
                  <p className="text-sm text-slate-500">Total items processed</p>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-sky-600">{stats.links}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-500"><LinkIcon className="h-3 w-3" /> Links</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-emerald-600">{stats.documents}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-500"><FileText className="h-3 w-3" /> Documents</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Open', icon: Globe, value: stats.types.open, color: 'text-green-500', bg: 'bg-green-500/10' },
              { label: 'Private', icon: Lock, value: stats.types.private, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Malicious', icon: AlertTriangle, value: stats.types.malicious, color: 'text-red-500', bg: 'bg-red-500/10' },
            ].map((type) => (
              <Card key={type.label} className="text-center transition-shadow hover:shadow-lg">
                <CardContent className="p-4">
                  <div className={`mx-auto w-10 h-10 rounded-full ${type.bg} flex items-center justify-center mb-2`}>
                    <type.icon className={`h-5 w-5 ${type.color}`} />
                  </div>
                  <div className="text-2xl font-bold">{type.value}</div>
                  <p className="text-xs text-slate-500">{type.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1">View All <ArrowRight className="h-3 w-3" /></Button>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {filteredActivity.length > 0 ? (
                filteredActivity.map((item, idx) => (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${item.type === 'pdf' ? 'bg-rose-100' : 'bg-sky-100'}`}>
                        {item.type === 'pdf' ? <File className="h-4 w-4 text-rose-600" /> : <LinkIcon className="h-4 w-4 text-sky-600" />}
                      </div>
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                          <span>Tags: {item.tags.map(tag => <Badge key={tag} variant="outline" className="ml-1 text-xs">{tag}</Badge>)}</span>
                          {item.isMalicious && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Malicious</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">{item.date}</div>
                  </motion.li>
                ))
              ) : (
                <li className="p-4 text-center text-slate-500">No matching items found.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}