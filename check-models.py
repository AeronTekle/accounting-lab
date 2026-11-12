"""Independent QR verification of the additional displayed OLS outputs."""
from pathlib import Path
import json
import numpy as np
from scipy import stats

root=Path(__file__).resolve().parent
extra=json.loads((root/'dist/coverage-extra.js').read_text().split('=',1)[1].strip().rstrip(';'))
refs=json.loads((root/'coverage-checks.json').read_text())
for key,m in extra['models'].items():
    X=np.array(refs[key]['X']);y=np.array(refs[key]['y']);Q,R=np.linalg.qr(X)
    b=np.linalg.solve(R,Q.T@y);res=y-X@b;df=len(y)-len(b)
    invR=np.linalg.solve(R,np.eye(len(b)));cov=invR@invR.T*(res@res)/df
    se=np.sqrt(np.diag(cov));p=2*stats.t.sf(abs(b/se),df)
    assert np.allclose(b,m['b'],rtol=1e-6,atol=1e-5),key
    assert np.allclose(se,[c['standardError'] for c in m['coefficients']],rtol=1e-6),key
    assert np.allclose(p,[c['pValue'] for c in m['coefficients']],rtol=1e-5,atol=1e-10),key
    assert abs((1-res@res/((y-y.mean())@(y-y.mean())))-m['r2'])<1e-10,key
    assert len(y)==309 and df>0
    # Ensure twelve significant digits, as displayed, suffice for numeric checks.
    if key.endswith('p'):
        ident='rC'+key[3:5]+'P';q=next(q for q in extra['questions'] if q['id']==ident)
        import re
        x,d=map(float,re.search(r'X=([0-9.e+-]+), D=([01])',q['prompt']).groups())
        display=np.array([float(f'{v:.12g}') for v in m['b']])
        assert abs(display@[1,x,d]-q['expected'])<q['tolerance'],ident
print('QR checks passed for coefficients, standard errors, p-values, R² and displayed prediction precision for all 120 additional model outputs (309 complete dates).')
