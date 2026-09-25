import React, { useState } from 'react';
import { api } from '../../api';
import { CheckCircle2, XCircle, RefreshCw, X, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemTestRunner: React.FC<Props> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testOutput, setTestOutput] = useState<{
    totalTests: number;
    passedCount: number;
    failedCount: number;
    allPassed: boolean;
    results: { id: string; category: string; name: string; passed: boolean; message: string }[];
  } | null>(null);

  if (!isOpen) return null;

  const runTests = async () => {
    setIsRunning(true);
    try {
      const data = await api.tests.runTests();
      setTestOutput(data);
    } catch (err: any) {
      alert('Test suite execution failed: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div id="modal-system-test-runner" className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-neutral-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">System Verification & Compliance Tests</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Automated test harness verifying RBAC, POS transactions, commission, and audit rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-200">
            <div>
              <span className="text-sm font-bold text-neutral-900">Verification Test Engine</span>
              <p className="text-xs text-neutral-600 mt-0.5">
                Executes live backend assertions on the SQLite relational database covering Auth, Tenant Isolation, Stock Deduction, GST Tax, 2% Commission, and Audit Redaction.
              </p>
            </div>
            <button
              id="btn-run-all-tests"
              onClick={runTests}
              disabled={isRunning}
              className="flex items-center space-x-2 px-4 py-2 bg-neutral-950 text-white hover:bg-neutral-800 rounded-lg text-xs font-bold transition shadow cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Running Tests...' : 'Run Automated Tests'}</span>
            </button>
          </div>

          {testOutput && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border flex items-center justify-between ${testOutput.allPassed ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-red-50/80 border-red-200 text-red-950'}`}>
                <div className="flex items-center space-x-3">
                  {testOutput.allPassed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-sm font-bold">
                      {testOutput.allPassed ? `All ${testOutput.totalTests} Architecture & Security Tests Passed` : `${testOutput.failedCount} Test(s) Failed`}
                    </h4>
                    <p className="text-xs opacity-80 mt-0.5">
                      {testOutput.passedCount} of {testOutput.totalTests} tests succeeded without warnings
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${testOutput.allPassed ? 'bg-emerald-200/80 text-emerald-900' : 'bg-red-200/80 text-red-900'}`}>
                  {testOutput.allPassed ? 'COMPLIANT' : 'FAILURES DETECTED'}
                </span>
              </div>

              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden bg-white">
                {testOutput.results.map((test) => (
                  <div key={test.id} className="p-3.5 flex items-start justify-between text-xs hover:bg-neutral-50/50 transition">
                    <div className="flex items-start space-x-3">
                      {test.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-neutral-900">{test.name}</span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                            {test.category}
                          </span>
                        </div>
                        <p className="text-neutral-500 mt-0.5 text-[11px]">{test.message}</p>
                      </div>
                    </div>
                    <span className={`font-mono text-[11px] font-bold ${test.passed ? 'text-emerald-700' : 'text-red-700'}`}>
                      {test.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-200 text-neutral-700 hover:bg-neutral-300 rounded-lg text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
