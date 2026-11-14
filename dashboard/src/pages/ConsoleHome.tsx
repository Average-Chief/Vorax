import React, { useState } from 'react';
import {
  Rocket,
  Award,
  Sparkles,
  ExternalLink,
  MoreVertical,
  GripVertical,
  X,
  Info,
  Server,
  Network,
  Layers,
  Key,
  Shield,
  Radio,
  Terminal,
  Activity,
  Boxes,
  Cpu,
  Database,
  Cloud,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  FileCode,
  Zap,
} from 'lucide-react';
import { TaskSummary } from '../lib/types';
import { StateChip } from '../components/StateChip';

interface ConsoleHomeProps {
  tasks: TaskSummary[];
  loading: boolean;
  onSelectTask: (taskId: string) => void;
  onNavigate: (tab: 'home' | 'tasks' | 'agents' | 'gateway') => void;
  onOpenCli: () => void;
}

export function ConsoleHome({
  tasks,
  loading,
  onSelectTask,
  onNavigate,
  onOpenCli,
}: ConsoleHomeProps) {
  const [showBanner, setShowBanner] = useState(true);
  const [activeSolutionsTab, setActiveSolutionsTab] = useState<'experiment' | 'build' | 'operate' | 'data_ai' | 'live_tasks'>('experiment');
  const [selectedBar, setSelectedBar] = useState<string | null>(null);

  // Derive live metrics from tasks
  const openIssues = tasks.filter((t) => {
    const s = (t.current_state || '').toLowerCase();
    return s === 'failed' || s === 'rejected';
  });
  const inFlightTasks = tasks.filter((t) => !t.is_terminal);
  const completedTasks = tasks.filter((t) => (t.current_state || '').toLowerCase() === 'completed');

  return (
    <div className="space-y-5 text-slate-200">
      {/* 1. Purple Dismissible Banner */}
      {showBanner && (
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[#1e1533] via-[#1c1a3a] to-[#121629] border border-purple-900/40 p-4 shadow-sm">
          <button
            onClick={() => setShowBanner(false)}
            className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
            title="Dismiss banner"
          >
            <X size={16} />
          </button>

          <div className="max-w-4xl space-y-2">
            <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <span>Give your coding agent current AWS knowledge and safe resource access</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="font-medium text-white underline decoration-slate-500 cursor-pointer">
                Agent Toolkit for AWS & A2A Gateway
              </span>{' '}
              provides up-to-date documentation, tested procedures, and IAM guardrails configured through a single setup prompt in your IDE.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={onOpenCli}
                className="px-3 py-1.5 rounded-full border border-slate-500 hover:border-white text-xs font-medium text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Get setup prompt
              </button>
              <span className="text-[11px] text-slate-400">
                Free | Works with Kiro, Claude Code, Codex and more
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Title & Action Bar */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white tracking-tight">Console home</h1>
          <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
            info
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 text-xs font-medium bg-[#1c2433] hover:bg-[#253044] text-slate-200 border border-slate-700/80 rounded transition-colors"
          >
            Reset to default layout
          </button>
          <button
            onClick={() => onNavigate('tasks')}
            className="px-3.5 py-1.5 text-xs font-bold bg-white hover:bg-slate-100 text-slate-900 rounded transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Add widgets</span>
          </button>
        </div>
      </div>

      {/* 3. Top Row Widgets: 3 Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Widget 1: Welcome to AWS / A2A Gateway (col-span-3 or 4) */}
        <div className="lg:col-span-4 bg-[#141b27] border border-[#222e42] rounded-lg p-4 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-slate-500 cursor-grab" />
                <h3 className="text-sm font-bold text-white">Welcome to AWS</h3>
              </div>
              <button className="text-slate-400 hover:text-slate-200 p-0.5">
                <MoreVertical size={14} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Item 1 */}
              <div className="flex items-start gap-3 group cursor-pointer" onClick={() => onNavigate('gateway')}>
                <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Rocket size={16} />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white group-hover:text-blue-400 flex items-center gap-1 transition-colors">
                    <span>Getting started with AWS</span>
                    <ArrowUpRight size={11} className="opacity-70" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Find out the fundamentals and valuable information to get the most out of AWS.
                  </p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-start gap-3 group cursor-pointer" onClick={() => onNavigate('tasks')}>
                <div className="w-8 h-8 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Award size={16} />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white group-hover:text-purple-400 flex items-center gap-1 transition-colors">
                    <span>Training and certification</span>
                    <ArrowUpRight size={11} className="opacity-70" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Learn from AWS experts and advance your skills and knowledge.
                  </p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-start gap-3 group cursor-pointer" onClick={() => onNavigate('agents')}>
                <div className="w-8 h-8 rounded bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
                  <Sparkles size={16} />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white group-hover:text-pink-400 flex items-center gap-1 transition-colors">
                    <span>AWS Builder Centre</span>
                    <ArrowUpRight size={11} className="opacity-70" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Learn, build, and connect with builders in the AWS community.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 2: Recently Visited (col-span-5) */}
        <div className="lg:col-span-5 bg-[#141b27] border border-[#222e42] rounded-lg p-4 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-slate-500 cursor-grab" />
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Recently visited</span>
                  <span className="text-[11px] text-blue-400 font-normal">info</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('agents')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-[#1c2433] hover:bg-[#253044] text-slate-300 border border-slate-700 rounded transition-colors"
                >
                  All services
                </button>
                <button className="text-slate-400 hover:text-slate-200 p-0.5">
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>

            {/* 2-column Grid of AWS Services */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
              {/* Column 1 */}
              <div className="space-y-2.5">
                <button
                  onClick={() => onNavigate('gateway')}
                  className="flex items-center gap-2 text-slate-300 hover:text-white w-full text-left group"
                >
                  <div className="w-5 h-5 rounded bg-orange-600/90 text-white flex items-center justify-center font-bold text-[9px] shadow-sm">
                    EC2
                  </div>
                  <span className="group-hover:underline">EC2</span>
                </button>

                <button
                  onClick={() => onNavigate('tasks')}
                  className="flex items-center gap-2 text-slate-300 hover:text-white w-full text-left group"
                >
                  <div className="w-5 h-5 rounded bg-orange-600 text-white flex items-center justify-center text-[10px]">
                    <Layers size={11} />
                  </div>
                  <span className="group-hover:underline">Batch</span>
                </button>

                <button
                  onClick={() => onNavigate('gateway')}
                  className="flex items-center gap-2 text-slate-300 hover:text-white w-full text-left group"
                >
                  <div className="w-5 h-5 rounded bg-rose-600 text-white flex items-center justify-center text-[10px]">
                    <Zap size={11} />
                  </div>
                  <span className="group-hover:underline">AWS Amplify</span>
                </button>

                <button
                  onClick={() => onNavigate('agents')}
                  className="flex items-center gap-2 text-slate-300 hover:text-white w-full text-left group"
                >
                  <div className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                    <Database size={11} />
                  </div>
                  <span className="group-hover:underline">S3</span>
                </button>

                <button
                  onClick={() => onNavigate('tasks')}
                  className="flex items-center gap-2 text-slate-300 hover:text-white w-full text-left group"
                >
                  <div className="w-5 h-5 rounded bg-pink-600 text-white flex items-center justify-center text-[10px]">
                    <Activity size={11} />
                  </div>
                  <span className="group-hover:underline">CloudWatch</span>
                </button>

                <button
                  onClick={() => onNavigate('agents')}
                  className="flex items-center gap-2 text-slate-300 hover:text-white w-full text-left group"
                >
                  <div className="w-5 h-5 rounded bg-orange-600 text-white flex items-center justify-center text-[10px]">
                    <Boxes size={11} />
                  </div>
                  <span className="group-hover:underline truncate">Elastic Container Registry</span>
                </button>

                <button
                  onClick={() => onNavigate('agents')}
                  className="flex items-center gap-2 text-slate-300 hover:text-white w-full text-left group"
                >
                  <div className="w-5 h-5 rounded bg-orange-600 text-white flex items-center justify-center text-[10px]">
                    <Cpu size={11} />
                  </div>
                  <span className="group-hover:underline truncate">Elastic Container Service</span>
                </button>

                <button
                  onClick={() => onNavigate('gateway')}
                  className="flex items-center gap-2 text-slate-300 hover:text-white w-full text-left group"
                >
                  <div className="w-5 h-5 rounded bg-rose-600 text-white flex items-center justify-center text-[10px]">
                    <Network size={11} />
                  </div>
                  <span className="group-hover:underline truncate">AWS Organizations</span>
                </button>

                <button
                  onClick={() => onNavigate('tasks')}
                  className="flex items-center gap-2 text-slate-300 hover:text-white w-full text-left group"
                >
                  <div className="w-5 h-5 rounded bg-rose-600 text-white flex items-center justify-center text-[10px]">
                    <Bell size={11} />
                  </div>
                  <span className="group-hover:underline truncate">AWS User Notifications</span>
                </button>
              </div>

              {/* Column 2 */}
              <div className="space-y-2.5">
                <button
                  onClick={onOpenCli}
                  className="flex items-center gap-2 text-slate-300 hover:text-white w-full text-left group"
                >
                  <div className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    <Terminal size={11} />
                  </div>
                  <span className="group-hover:underline">CloudShell</span>
                </button>

                <button
                  onClick={() => onNavigate('gateway')}
                  className="flex items-center gap-2 text-slate-300 hover:text-white w-full text-left group"
                >
                  <div className="w-5 h-5 rounded bg-pink-600 text-white flex items-center justify-center text-[10px]">
                    <Server size={11} />
                  </div>
                  <span className="group-hover:underline">Systems Manager</span>
                </button>

                <button
                  onClick={() => onNavigate('gateway')}
                  className="flex items-center gap-2 text-slate-300 hover:text-white w-full text-left group"
                >
                  <div className="w-5 h-5 rounded bg-rose-600 text-white flex items-center justify-center text-[10px]">
                    <Key size={11} />
                  </div>
                  <span className="group-hover:underline">IAM</span>
                </button>

                <button
                  onClick={() => onNavigate('gateway')}
                  className="flex items-center gap-2 text-slate-300 hover:text-white w-full text-left group"
                >
                  <div className="w-5 h-5 rounded bg-purple-600 text-white flex items-center justify-center text-[10px]">
                    <Cloud size={11} />
                  </div>
                  <span className="group-hover:underline">CloudFront</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <span className="text-slate-600 select-none text-xs font-mono">///</span>
          </div>
        </div>

        {/* Widget 3: AWS Health (col-span-3) */}
        <div className="lg:col-span-3 bg-[#141b27] border border-[#222e42] rounded-lg p-4 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-slate-500 cursor-grab" />
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>AWS Health</span>
                  <span className="text-[11px] text-blue-400 font-normal">info</span>
                </h3>
              </div>
              <button className="text-slate-400 hover:text-slate-200 p-0.5">
                <MoreVertical size={14} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Open issues</div>
                  <div className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{openIssues.length}</span>
                    {openIssues.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 font-normal border border-red-500/30">
                        Needs Attention
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 text-right">Past 7 days</div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/60 pt-3">
                <div>
                  <div className="text-xs text-slate-400">Scheduled changes</div>
                  <div className="text-lg font-bold text-white">2</div>
                </div>
                <div className="text-[11px] text-slate-500 text-right">Upcoming and past 7 days</div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/60 pt-3">
                <div>
                  <div className="text-xs text-slate-400">Other notifications</div>
                  <div className="text-lg font-bold text-white">0</div>
                </div>
                <div className="text-[11px] text-slate-500 text-right">Past 7 days</div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 text-right">
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
            >
              <span>Go to AWS Health</span>
              <ArrowUpRight size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Row Widgets: 2 Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Widget 4: Cost and Usage / Latency & Traffic (col-span-5) */}
        <div className="lg:col-span-5 bg-[#141b27] border border-[#222e42] rounded-lg p-4 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-slate-500 cursor-grab" />
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Cost and usage</span>
                  <span className="text-[11px] text-blue-400 font-normal">info</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('gateway')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-[#1c2433] hover:bg-[#253044] text-slate-300 border border-slate-700 rounded transition-colors"
                >
                  Cost management
                </button>
                <button className="text-slate-400 hover:text-slate-200 p-0.5">
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Left Column: Cost Numbers */}
              <div className="sm:col-span-5 space-y-3">
                <div>
                  <div className="text-[11px] text-slate-400">Current month</div>
                  <div className="text-lg font-bold text-white flex items-center gap-1.5">
                    <span>US$503.61</span>
                    <span className="text-[11px] text-emerald-400 flex items-center">
                      <TrendingDown size={11} /> 6%
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400">Forecasted month end</div>
                  <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <span>US$1,001.16</span>
                    <span className="text-[11px] text-amber-400 flex items-center">
                      <TrendingUp size={11} /> 8%
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400">Savings opportunities</div>
                  <div className="text-sm font-semibold text-white flex items-center gap-1">
                    <span>US$294.61/mo</span>
                    <Info size={11} className="text-slate-500" />
                  </div>
                </div>
              </div>

              {/* Right Column: Multi-Color Stacked Bar Chart */}
              <div className="sm:col-span-7">
                <div className="text-[10px] text-slate-400 text-right mb-1">Cost (US$)</div>
                <div className="h-32 flex items-end justify-between gap-2 pt-2 border-b border-slate-700">
                  {/* Bars */}
                  {[
                    { month: 'Jun 26', total: 42, color1: 'h-4 bg-teal-400', color2: 'h-3 bg-pink-500', color3: 'h-2 bg-orange-400', color4: 'h-2 bg-blue-500' },
                    { month: 'Jul 26', total: 48, color1: 'h-5 bg-teal-400', color2: 'h-3 bg-pink-500', color3: 'h-3 bg-orange-400', color4: 'h-2 bg-blue-500' },
                    { month: 'Aug 26', total: 68, color1: 'h-7 bg-teal-400', color2: 'h-4 bg-pink-500', color3: 'h-4 bg-orange-400', color4: 'h-3 bg-blue-500' },
                    { month: 'Sept 26', total: 72, color1: 'h-8 bg-teal-400', color2: 'h-5 bg-pink-500', color3: 'h-4 bg-orange-400', color4: 'h-3 bg-blue-500' },
                    { month: 'Oct 26', total: 70, color1: 'h-7 bg-teal-400', color2: 'h-5 bg-pink-500', color3: 'h-4 bg-orange-400', color4: 'h-3 bg-blue-500' },
                    { month: 'Nov 26', total: 34, color1: 'h-4 bg-teal-400', color2: 'h-2 bg-pink-500', color3: 'h-2 bg-orange-400', color4: 'h-2 bg-blue-500' },
                  ].map((bar, idx) => (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-1 group cursor-pointer"
                      onClick={() => setSelectedBar(bar.month)}
                    >
                      <div className="w-full max-w-[24px] flex flex-col-reverse rounded-t overflow-hidden bg-slate-800/40 group-hover:brightness-110 transition-all">
                        <div className={`w-full ${bar.color4}`} />
                        <div className={`w-full ${bar.color3}`} />
                        <div className={`w-full ${bar.color2}`} />
                        <div className={`w-full ${bar.color1}`} />
                      </div>
                      <span className="text-[9px] text-slate-400 transform -rotate-45 sm:rotate-0 origin-center truncate">
                        {bar.month}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-500 pt-1">
                  <span>Month (Year)</span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal-400" />EC2</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-pink-500" />S3</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400" />RDS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 5: Solutions (13) / Live Tasks (col-span-7) */}
        <div className="lg:col-span-7 bg-[#141b27] border border-[#222e42] rounded-lg p-4 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-2">
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-slate-500 cursor-grab" />
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Solutions (13)</span>
                  <span className="text-[11px] text-blue-400 font-normal">info</span>
                </h3>
              </div>
              <button className="text-slate-400 hover:text-slate-200 p-0.5">
                <MoreVertical size={14} />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              Vetted solutions from AWS for popular business and technical use cases.
            </p>

            {/* Underline Tabs */}
            <div className="flex items-center gap-4 border-b border-slate-800 text-xs mb-3">
              <button
                onClick={() => setActiveSolutionsTab('experiment')}
                className={`pb-2 font-medium transition-colors border-b-2 ${
                  activeSolutionsTab === 'experiment'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Experiment (2)
              </button>

              <button
                onClick={() => setActiveSolutionsTab('build')}
                className={`pb-2 font-medium transition-colors border-b-2 ${
                  activeSolutionsTab === 'build'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Build (4)
              </button>

              <button
                onClick={() => setActiveSolutionsTab('operate')}
                className={`pb-2 font-medium transition-colors border-b-2 ${
                  activeSolutionsTab === 'operate'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Operate (3)
              </button>

              <button
                onClick={() => setActiveSolutionsTab('data_ai')}
                className={`pb-2 font-medium transition-colors border-b-2 ${
                  activeSolutionsTab === 'data_ai'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Data and AI (4)
              </button>

              <button
                onClick={() => setActiveSolutionsTab('live_tasks')}
                className={`pb-2 font-medium transition-colors border-b-2 ml-auto flex items-center gap-1.5 ${
                  activeSolutionsTab === 'live_tasks'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-amber-400/70 hover:text-amber-300'
                }`}
              >
                <Zap size={12} />
                <span>Live Feed ({tasks.length})</span>
              </button>
            </div>

            {/* Content for Tabs */}
            {activeSolutionsTab === 'live_tasks' ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {tasks.slice(0, 6).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t.id)}
                    className="flex items-center justify-between p-2 rounded bg-slate-900/60 hover:bg-slate-800 border border-slate-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <StateChip state={t.current_state} />
                      <span className="text-xs font-mono text-slate-300 truncate max-w-[180px] sm:max-w-[280px]">
                        {t.id}
                      </span>
                    </div>
                    <span className="text-[11px] text-blue-400 hover:underline shrink-0">View Timeline ↗</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-white">
                    Provision temporary, recyclable AWS sandbox accounts with guardrails
                  </div>
                  <div className="text-[11px] text-blue-400 hover:underline cursor-pointer flex items-center gap-1">
                    <span>Find out more</span>
                    <ArrowUpRight size={10} />
                  </div>
                  <div className="text-[11px] text-slate-400 pt-0.5">Time to complete: 1 hour</div>
                </div>

                <div className="space-y-1 border-t border-slate-800/60 pt-2.5">
                  <div className="text-xs font-semibold text-white">
                    Train autonomous racing models with reinforcement learning
                  </div>
                  <div className="text-[11px] text-blue-400 hover:underline cursor-pointer flex items-center gap-1">
                    <span>Deploy</span>
                    <ArrowUpRight size={10} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
