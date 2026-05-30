const financialService = require('../services/financialService');

exports.listTaxCategories = async (req, res, next) => {
  try {
    const cats = await financialService.listTaxCategories(req.user.company_id);
    res.json(cats);
  } catch (err) { next(err); }
};

exports.listAccounts = async (req, res, next) => {
  try {
    const accounts = await financialService.listAccounts(req.user.company_id);
    res.json(accounts);
  } catch (err) { next(err); }
};

exports.listTransactions = async (req, res, next) => {
  try {
    const txns = await financialService.listTransactions(req.user.company_id, req.query);
    res.json(txns);
  } catch (err) { next(err); }
};

exports.createTransaction = async (req, res, next) => {
  try {
    const txn = await financialService.createTransaction(req.user.company_id, req.body);
    res.status(201).json(txn);
  } catch (err) { next(err); }
};

exports.updateTransaction = async (req, res, next) => {
  try {
    const txn = await financialService.updateTransaction(req.user.company_id, req.params.id, req.body);
    res.json(txn);
  } catch (err) { next(err); }
};

exports.deleteTransaction = async (req, res, next) => {
  try {
    await financialService.deleteTransaction(req.user.company_id, req.params.id);
    res.json({ message: 'Transaction deleted' });
  } catch (err) { next(err); }
};

exports.taxSummary = async (req, res, next) => {
  try {
    const summary = await financialService.getTaxSummary(req.user.company_id, req.query.year);
    res.json(summary);
  } catch (err) { next(err); }
};

exports.syncQuickBooks = async (req, res, next) => {
  try {
    const results = await financialService.syncFromQuickBooks(req.user.company_id);
    res.json({ message: 'QuickBooks sync completed', ...results });
  } catch (err) { next(err); }
};
