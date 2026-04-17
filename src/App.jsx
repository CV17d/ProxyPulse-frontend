import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Activity, 
  Server, 
  ShieldAlert, 
  RefreshCcw, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Database,
  ShoppingCart,
  CreditCard,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';

const API_BASE = 'http://localhost:8080/api';

const translateService = (name) => {
  switch (name) {
    case 'INVENTORY': return 'INVENTARIO';
    case 'ORDERS': return 'PEDIDOS';
    case 'PAYMENTS': return 'PAGOS';
    default: return name;
  }
};

const ServiceIcon = ({ name }) => {
  switch (name) {
    case 'INVENTORY': case 'INVENTARIO': return <Database size={20} />;
    case 'ORDERS': case 'PEDIDOS': return <ShoppingCart size={20} />;
    case 'PAYMENTS': case 'PAGOS': return <CreditCard size={20} />;
    default: return <Server size={20} />;
  }
};

function App() {
  const [metrics, setMetrics] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);
  const [filters, setFilters] = useState({
    service: 'ALL',
    status: 'ALL'
  });

  const fetchData = useCallback(async () => {
    try {
      const [metricsRes, logsRes] = await Promise.all([
        axios.get(`${API_BASE}/metrics/summary`),
        axios.get(`${API_BASE}/metrics/logs`, { 
          params: { 
            service: filters.service, 
            status: filters.status,
            size: 15
          } 
        })
      ]);
      setMetrics(metricsRes.data);
      setLogs(logsRes.data.content);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000); // Polling every 3s
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      await axios.post(`${API_BASE}/metrics/simulate-load`);
      await fetchData();
    } finally {
      setSimulating(false);
    }
  };

  const chartData = logs
    .slice(0, 20)
    .reverse()
    .map(log => ({
      time: log.timestamp.split('T')[1].split('.')[0],
      duration: log.durationMs,
      service: log.serviceId
    }));

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="title-group">
          <h1>PulsoProxy</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Dashboard de Observabilidad de Microservicios</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={handleSimulate} 
          disabled={simulating}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Activity size={18} className={simulating ? 'animate-spin' : ''} />
          {simulating ? 'Simulando...' : 'Simular Carga'}
        </button>
      </header>

      <div className="service-grid">
        {['INVENTORY', 'ORDERS', 'PAYMENTS'].map(serviceName => {
          const serviceMetrics = metrics.find(m => m.serviceId === serviceName) || {
            totalCalls: 0,
            successRate: 100,
            avgDuration: 0,
            totalErrors: 0
          };
          const isCritical = (100 - serviceMetrics.successRate) > 15;

          return (
            <div key={serviceName} className={`service-card ${isCritical ? 'critical' : ''} animate-fade`}>
              <div className="service-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ color: isCritical ? 'var(--error)' : 'var(--accent-color)' }}>
                    <ServiceIcon name={serviceName} />
                  </div>
                  <span className="service-name">{translateService(serviceName)}</span>
                </div>
                <span className={`status-badge ${isCritical ? 'error' : 'success'}`}>
                  {isCritical ? 'Inestable' : 'Saludable'}
                </span>
              </div>
              
              <div className="metric-row">
                <div className="metric-item">
                  <span className="metric-label">Llamadas</span>
                  <span className="metric-value">{serviceMetrics.totalCalls}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Tasa de Éxito</span>
                  <span className="metric-value" style={{ color: isCritical ? 'var(--error)' : 'var(--success)' }}>
                    {serviceMetrics.successRate.toFixed(1)}%
                  </span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Tiempo Prom.</span>
                  <span className="metric-value">{Math.round(serviceMetrics.avgDuration)}ms</span>
                </div>
              </div>
              
              {isCritical && (
                <div style={{ marginTop: '1rem', color: 'var(--error)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldAlert size={14} /> Alta tasa de error detectada
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="charts-section animate-fade">
        <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Tiempo de Respuesta (Últimas 20 Llamadas)</h3>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
            <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickMargin={10} />
            <YAxis stroke="#94a3b8" fontSize={12} unit="ms" />
            <Tooltip 
              contentStyle={{ background: '#1a1d27', border: '1px solid #2d3748', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="duration" 
              stroke="#6366f1" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#6366f1' }}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              name="Tiempo de Respuesta"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="logs-section animate-fade">
        <div className="filters-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={18} color="var(--text-secondary)" />
            <select 
              value={filters.service} 
              onChange={e => setFilters(f => ({ ...f, service: e.target.value }))}
            >
              <option value="ALL">Todos los Servicios</option>
              <option value="INVENTORY">Inventario</option>
              <option value="ORDERS">Pedidos</option>
              <option value="PAYMENTS">Pagos</option>
            </select>
          </div>
          <select 
            value={filters.status} 
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            <option value="ALL">Todos los Estados</option>
            <option value="SUCCESS">Éxito</option>
            <option value="ERROR">Error</option>
          </select>
          <div style={{ flex: 1 }}></div>
          <button className="btn-secondary" onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCcw size={16} /> Actualizar
          </button>
        </div>

        <table className="logs-table">
          <thead>
            <tr>
              <th>ID Petición</th>
              <th>Servicio</th>
              <th>Operación</th>
              <th>Duración</th>
              <th>Estado</th>
              <th>Marca de Tiempo</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <React.Fragment key={log.requestId}>
                <tr onClick={() => setExpandedLog(expandedLog === log.requestId ? null : log.requestId)}>
                  <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {log.requestId.substring(0, 8)}...
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ServiceIcon name={log.serviceId} />
                      {translateService(log.serviceId)}
                    </div>
                  </td>
                  <td>{log.operation}</td>
                  <td>{log.durationMs}ms</td>
                  <td>
                    <span className={`status-badge ${log.status === 'SUCCESS' ? 'success' : 'error'}`}>
                      {log.status === 'SUCCESS' ? 'ÉXITO' : 'ERROR'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
                {expandedLog === log.requestId && (
                  <tr>
                    <td colSpan="6">
                      <div className="log-details">
                        <div style={{ marginBottom: '0.5rem', borderBottom: '1px solid #2d3748', paddingBottom: '0.5rem' }}>
                          <strong>Detalle de Respuesta:</strong>
                        </div>
                        {log.status === 'SUCCESS' ? (
                          log.response ? log.response : 'Sin contenido'
                        ) : (
                          <span style={{ color: 'var(--error)' }}>{log.errorMessage}</span>
                        )}
                        <div style={{ marginTop: '0.8rem', opacity: 0.6 }}>
                          ID de Seguimiento Completo: {log.requestId}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  No se encontraron logs. Haz clic en "Simular Carga" para ver acción.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
